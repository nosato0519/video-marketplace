import { getPool } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from '../orders/order-state.js';
import { verifyPaymentAgainstOrder } from './payment-verification.js';

export async function completePayment({
  eventId,
  provider,
  providerPaymentId,
  orderId,
  payloadHash,
  payment,
}) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const event = await client.query(
      `SELECT id, status, payload_hash
         FROM payment_events
        WHERE provider = $1 AND event_id = $2
        FOR UPDATE`,
      [provider, eventId]
    );

    if (event.rowCount === 0) throw new Error('payment_event_not_found');
    if (event.rows[0].status === 'processed') {
      await client.query('ROLLBACK');
      return { duplicate: true };
    }

    if (event.rows[0].payload_hash && event.rows[0].payload_hash !== payloadHash) {
      throw new Error('payment_event_payload_mismatch');
    }

    const order = await client.query(
      `SELECT id, buyer_id, product_id, amount, currency, status, provider, provider_payment_id
         FROM orders
        WHERE id = $1
        FOR UPDATE`,
      [orderId]
    );

    if (order.rowCount === 0) throw new Error('order_not_found');
    const current = order.rows[0];

    verifyPaymentAgainstOrder({
      payment: {
        ...payment,
        orderId: payment?.orderId ?? current.id,
        amount: payment?.amount ?? current.amount,
        currency: payment?.currency ?? current.currency,
      },
      order: current,
    });

    if (current.status === ORDER_STATES.PAID) {
      await client.query(
        `UPDATE payment_events
            SET status = 'processed', processed_at = NOW(), order_id = $1
          WHERE id = $2`,
        [current.id, event.rows[0].id]
      );
      await client.query('COMMIT');
      return { duplicate: true, alreadyPaid: true };
    }

    if (!canTransitionOrder(current.status, ORDER_STATES.PAID)) {
      throw new Error('order_not_payable');
    }

    const updated = await client.query(
      `UPDATE orders
          SET status = 'paid',
              provider = $1,
              provider_payment_id = $2,
              paid_at = NOW()
        WHERE id = $3
        RETURNING id, buyer_id, product_id, amount, currency, status, provider, provider_payment_id, paid_at`,
      [provider, providerPaymentId, current.id]
    );

    const entitlement = await client.query(
      `INSERT INTO entitlements (user_id, product_id, order_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (order_id) DO NOTHING
       RETURNING id, user_id, product_id, order_id, status, created_at`,
      [current.buyer_id, current.product_id, current.id]
    );

    await client.query(
      `UPDATE payment_events
          SET status = 'processed', processed_at = NOW(), order_id = $1, payload_hash = $2
        WHERE id = $3`,
      [current.id, payloadHash, event.rows[0].id]
    );

    await client.query('COMMIT');

    return {
      duplicate: false,
      order: updated.rows[0],
      entitlement: entitlement.rows[0] ?? null,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
