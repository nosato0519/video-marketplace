import { getPool } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from '../orders/order-state.js';

async function reconcileRefundedEntitlement(client, { orderId, buyerId, productId }) {
  const entitlementResult = await client.query(
    `SELECT id, user_id, product_id, order_id, status, revoked_at
       FROM entitlements
      WHERE order_id = $1
      FOR UPDATE`,
    [orderId]
  );
  const entitlement = entitlementResult.rows[0];
  if (!entitlement) return null;

  const replacementResult = await client.query(
    `SELECT replacement.id
       FROM orders replacement
      WHERE replacement.buyer_id = $1
        AND replacement.product_id = $2
        AND replacement.status = 'paid'
        AND replacement.id <> $3
        AND EXISTS (
          SELECT 1
            FROM payments replacement_payment
           WHERE replacement_payment.order_id = replacement.id
             AND replacement_payment.status = 'succeeded'
        )
      ORDER BY replacement.paid_at DESC NULLS LAST, replacement.id DESC
      LIMIT 1
      FOR UPDATE`,
    [buyerId, productId, orderId]
  );
  const replacementOrderId = replacementResult.rows[0]?.id;

  if (!replacementOrderId) {
    const revoked = await client.query(
      `UPDATE entitlements
          SET status = 'revoked', revoked_at = COALESCE(revoked_at, NOW())
        WHERE id = $1
          AND (status = 'active' OR revoked_at IS NULL)
        RETURNING id, user_id, product_id, order_id, status, revoked_at`,
      [entitlement.id]
    );
    return revoked.rows[0] ?? entitlement;
  }

  const replacementEntitlementResult = await client.query(
    `SELECT id, status
       FROM entitlements
      WHERE order_id = $1
        AND user_id = $2
        AND product_id = $3
      FOR UPDATE`,
    [replacementOrderId, entitlement.user_id, entitlement.product_id]
  );
  const replacementEntitlement = replacementEntitlementResult.rows[0];

  if (!replacementEntitlement) {
    const reassigned = await client.query(
      `UPDATE entitlements
          SET order_id = $2, status = 'active', revoked_at = NULL
        WHERE id = $1
        RETURNING id, user_id, product_id, order_id, status, revoked_at`,
      [entitlement.id, replacementOrderId]
    );
    return reassigned.rows[0] ?? null;
  }

  await client.query(
    `UPDATE entitlements
        SET status = 'revoked', revoked_at = COALESCE(revoked_at, NOW())
      WHERE id = $1 AND status = 'active'`,
    [entitlement.id]
  );

  if (replacementEntitlement.status !== 'active') {
    await client.query(
      `UPDATE entitlements
          SET status = 'active', revoked_at = NULL
        WHERE id = $1`,
      [replacementEntitlement.id]
    );
  }

  return {
    id: replacementEntitlement.id,
    user_id: entitlement.user_id,
    product_id: entitlement.product_id,
    order_id: replacementOrderId,
    status: 'active',
    revoked_at: null,
  };
}

export async function refundPayment({
  eventId,
  provider,
  providerPaymentId,
  orderId,
  payloadHash,
  refundAmount,
  refundMode = 'incremental',
  refundCurrency,
}) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const event = await client.query(
      `SELECT id, status, event_type, provider_payment_id, payload_hash, order_id
         FROM payment_events
        WHERE provider = $1 AND event_id = $2
        FOR UPDATE`,
      [provider, eventId]
    );

    if (event.rowCount === 0) throw new Error('payment_event_not_found');
    const recordedEvent = event.rows[0];

    if (
      recordedEvent.event_type !== 'payment_refunded' ||
      recordedEvent.provider_payment_id !== providerPaymentId ||
      recordedEvent.payload_hash !== payloadHash ||
      (recordedEvent.order_id != null && String(recordedEvent.order_id) !== String(orderId ?? ''))
    ) {
      throw new Error('payment_event_payload_mismatch');
    }

    if (recordedEvent.status === 'processed') {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    // Read the buyer/product without taking an order lock. Acquire the shared
    // buyer/product lock first so concurrent refunds cannot deadlock while
    // each holds a different order row and tries to lock the other's order.
    const orderIdentity = await client.query(
      `SELECT id, product_id, buyer_id
         FROM orders
        WHERE id = $1`,
      [orderId]
    );
    if (orderIdentity.rowCount === 0) throw new Error('order_not_found');
    const identity = orderIdentity.rows[0];

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))`,
      [String(identity.buyer_id), String(identity.product_id)]
    );

    const order = await client.query(
      `SELECT o.id, o.status, o.product_id, o.buyer_id
         FROM orders o
        WHERE o.id = $1
        FOR UPDATE`,
      [orderId]
    );

    if (order.rowCount === 0) throw new Error('order_not_found');
    const current = order.rows[0];

    const paymentRecord = await client.query(
      `SELECT id, order_id, provider, provider_payment_id, status
         FROM payments
        WHERE order_id = $1 AND provider = $2
        FOR UPDATE`,
      [current.id, provider]
    );

    if (paymentRecord.rowCount === 0) throw new Error('payment_record_not_found');
    const currentPayment = paymentRecord.rows[0];
    if (currentPayment.provider_payment_id !== providerPaymentId) {
      throw new Error('provider_payment_id_mismatch');
    }
    if (currentPayment.status !== 'succeeded' && currentPayment.status !== 'refunded') {
      throw new Error('payment_not_refundable');
    }

    const requestedRefund = Number(refundAmount);
    const originalAmount = Number(currentPayment.amount);
    const previousRefunded = Number(currentPayment.refunded_amount || 0);
    if (!Number.isFinite(requestedRefund) || requestedRefund <= 0) {
      throw new Error('invalid_refund_amount');
    }
    if (refundMode !== 'incremental' && refundMode !== 'cumulative') {
      throw new Error('invalid_refund_mode');
    }
    if (refundCurrency && String(refundCurrency).toUpperCase() !== String(currentPayment.currency).toUpperCase()) {
      throw new Error('payment_currency_mismatch');
    }

    const cumulativeRefund = refundMode === 'cumulative'
      ? requestedRefund
      : previousRefunded + requestedRefund;
    const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;
    if (cumulativeRefund < previousRefunded - 0.001) {
      await client.query(
        `UPDATE payment_events SET status = 'processed', processed_at = NOW() WHERE id = $1`,
        [recordedEvent.id]
      );
      await client.query('COMMIT');
      return { duplicate: false, ignored: true, reason: 'stale_refund_event' };
    }
    if (cumulativeRefund > originalAmount + 0.001) {
      throw new Error('refund_amount_exceeds_payment');
    }
    const isFullRefund = money(cumulativeRefund) >= money(originalAmount);

    if (!isFullRefund) {
      await client.query(
        `UPDATE payments SET refunded_amount = $1 WHERE id = $2`,
        [money(cumulativeRefund), currentPayment.id]
      );
      await client.query(
        `UPDATE seller_earnings
            SET refunded_amount = LEAST(gross_amount, $2),
                net_amount = CASE
                  WHEN gross_amount <= 0 THEN 0
                  ELSE ROUND(GREATEST(0, gross_amount - platform_fee) *
                    (1 - LEAST(gross_amount, $2) / gross_amount), 2)
                END
          WHERE order_id = $1
            AND product_id = $3
            AND status IN ('pending', 'available', 'paid')`,
        [current.id, money(cumulativeRefund), current.product_id]
      );
      await client.query(
        `UPDATE payment_events SET status = 'processed', processed_at = NOW() WHERE id = $1`,
        [recordedEvent.id]
      );
      await client.query('COMMIT');
      return {
        duplicate: false,
        partial: true,
        refundedAmount: money(cumulativeRefund),
        remainingAmount: money(originalAmount - cumulativeRefund),
      };
    }

    if (current.status === ORDER_STATES.REFUNDED) {
      await reconcileRefundedEntitlement(client, {
        orderId: current.id,
        buyerId: current.buyer_id,
        productId: current.product_id,
      });

      if (currentPayment.status !== 'refunded') {
        await client.query(
          `UPDATE payments
              SET status = 'refunded', refunded_at = COALESCE(refunded_at, NOW())
            WHERE id = $1`,
          [currentPayment.id]
        );
      }
      await client.query(
        `UPDATE seller_earnings
            SET status = 'refunded', refunded_amount = LEAST(gross_amount, $3),
              net_amount = 0, refunded_at = COALESCE(refunded_at, NOW())
          WHERE order_id = $1
            AND product_id = $2
            AND status IN ('pending', 'available', 'paid')`,
        [current.id, current.product_id, money(cumulativeRefund)]
      );
      await client.query(
        `UPDATE payment_events
            SET status = 'processed', processed_at = NOW()
          WHERE id = $1`,
        [recordedEvent.id]
      );
      await client.query('COMMIT');
      return { duplicate: true, alreadyRefunded: true };
    }

    if (!canTransitionOrder(current.status, ORDER_STATES.REFUNDED)) {
      throw new Error('order_not_refundable');
    }

    const updated = await client.query(
      `UPDATE orders
          SET status = 'refunded', refunded_at = NOW()
        WHERE id = $1
        RETURNING id, status, refunded_at`,
      [current.id]
    );

    const revoked = await reconcileRefundedEntitlement(client, {
      orderId: current.id,
      buyerId: current.buyer_id,
      productId: current.product_id,
    });

    const earnings = await client.query(
      `UPDATE seller_earnings
          SET status = 'refunded', refunded_amount = LEAST(gross_amount, $3),
              net_amount = 0, refunded_at = NOW()
        WHERE order_id = $1
          AND product_id = $2
          AND status IN ('pending', 'available', 'paid')
        RETURNING id, seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status, refunded_at`,
      [current.id, current.product_id, money(cumulativeRefund)]
    );

    const updatedPayment = await client.query(
      `UPDATE payments
          SET status = 'refunded', refunded_amount = $2, refunded_at = NOW()
        WHERE id = $1
        RETURNING id, order_id, provider, provider_payment_id, amount, currency, status, succeeded_at, refunded_at, refunded_amount`,
      [currentPayment.id, money(cumulativeRefund)]
    );

    await client.query(
      `UPDATE payment_events
          SET status = 'processed', processed_at = NOW()
        WHERE id = $1`,
      [recordedEvent.id]
    );

    await client.query('COMMIT');

    return {
      duplicate: false,
      order: updated.rows[0],
      payment: updatedPayment.rows[0],
      entitlement: revoked ?? null,
      earnings: earnings.rows[0] ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
