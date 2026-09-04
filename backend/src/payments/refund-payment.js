import { getPool } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from '../orders/order-state.js';

export async function refundPayment({
  eventId,
  provider,
  providerPaymentId,
  orderId,
  payloadHash,
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

    if (recordedEvent.status === 'processed') {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    if (
      recordedEvent.event_type !== 'payment_refunded' ||
      recordedEvent.provider_payment_id !== providerPaymentId ||
      recordedEvent.payload_hash !== payloadHash ||
      (recordedEvent.order_id ?? null) !== (orderId ?? null)
    ) {
      throw new Error('payment_event_payload_mismatch');
    }

    const order = await client.query(
      `SELECT o.id, o.status, o.product_id
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

    if (current.status === ORDER_STATES.REFUNDED) {
      if (currentPayment.status !== 'refunded') {
        await client.query(
          `UPDATE payments
              SET status = 'refunded', refunded_at = COALESCE(refunded_at, NOW())
            WHERE id = $1`,
          [currentPayment.id]
        );
      }
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

    const revoked = await client.query(
      `UPDATE entitlements
          SET status = 'revoked', revoked_at = NOW()
        WHERE order_id = $1 AND status = 'active'
        RETURNING id, user_id, product_id, order_id, status, revoked_at`,
      [current.id]
    );

    const earnings = await client.query(
      `UPDATE seller_earnings
          SET status = 'refunded', refunded_at = NOW()
        WHERE order_id = $1
          AND product_id = $2
          AND status IN ('pending', 'available', 'paid')
        RETURNING id, seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status, refunded_at`,
      [current.id, current.product_id]
    );

    const updatedPayment = await client.query(
      `UPDATE payments
          SET status = 'refunded', refunded_at = NOW()
        WHERE id = $1
        RETURNING id, order_id, provider, provider_payment_id, amount, currency, status, succeeded_at, refunded_at`,
      [currentPayment.id]
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
      entitlement: revoked.rows[0] ?? null,
      earnings: earnings.rows[0] ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
