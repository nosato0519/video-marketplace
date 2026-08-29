import { getPool } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from '../orders/order-state.js';
import { verifyPaymentAgainstOrder } from './payment-verification.js';
import { validateSuccessfulPaymentSettlement } from './payment-success-guard.js';

export async function completePayment({ eventId, provider, providerPaymentId, orderId, payloadHash, payment }) {
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const event = await client.query(
      `SELECT id, status, payload_hash FROM payment_events WHERE provider = $1 AND event_id = $2 FOR UPDATE`,
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
      `SELECT o.id, o.buyer_id, o.product_id, o.amount, o.currency, o.status, o.provider, o.provider_payment_id,
              p.seller_id
         FROM orders o
         JOIN products p ON p.id = o.product_id
        WHERE o.id = $1
        FOR UPDATE OF o, p`,
      [orderId]
    );
    if (order.rowCount === 0) throw new Error('order_not_found');
    const current = order.rows[0];

    verifyPaymentAgainstOrder({ payment, order: current });
    if (current.status !== ORDER_STATES.PAID) {
      validateSuccessfulPaymentSettlement({
        order: current,
        payment: { ...payment, provider_payment_id: providerPaymentId },
      });
    }

    const paymentRecord = await client.query(
      `SELECT id, order_id, user_id, provider, provider_payment_id, amount, currency, status
         FROM payments WHERE order_id = $1 AND provider = $2 FOR UPDATE`,
      [current.id, provider]
    );
    if (paymentRecord.rowCount === 0) throw new Error('payment_record_not_found');
    const currentPayment = paymentRecord.rows[0];
    if (currentPayment.provider_payment_id && currentPayment.provider_payment_id !== providerPaymentId) {
      throw new Error('provider_payment_id_mismatch');
    }
    if (Number(currentPayment.amount) !== Number(current.amount)) throw new Error('payment_amount_mismatch');
    if (String(currentPayment.currency).toUpperCase() !== String(current.currency).toUpperCase()) {
      throw new Error('payment_currency_mismatch');
    }

    if (current.status === ORDER_STATES.PAID) {
      await client.query(
        `INSERT INTO seller_earnings
          (seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status)
         VALUES ($1, $2, $3, $4, 0, $4, $5, 'available')
         ON CONFLICT (order_id, product_id) DO NOTHING`,
        [current.seller_id, current.id, current.product_id, current.amount, current.currency]
      );
      await client.query(
        `UPDATE payment_events SET status = 'processed', processed_at = NOW(), order_id = $1 WHERE id = $2`,
        [current.id, event.rows[0].id]
      );
      await client.query('COMMIT');
      return { duplicate: true, alreadyPaid: true };
    }
    if (!canTransitionOrder(current.status, ORDER_STATES.PAID)) throw new Error('order_not_payable');

    const updatedPayment = await client.query(
      `UPDATE payments SET provider_payment_id = $1, status = 'succeeded', succeeded_at = NOW()
       WHERE id = $2 RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status, succeeded_at`,
      [providerPaymentId, currentPayment.id]
    );
    const updated = await client.query(
      `UPDATE orders SET status = 'paid', provider = $1, provider_payment_id = $2, paid_at = NOW()
       WHERE id = $3 RETURNING id, buyer_id, product_id, amount, currency, status, provider, provider_payment_id, paid_at`,
      [provider, providerPaymentId, current.id]
    );
    const entitlement = await client.query(
      `INSERT INTO entitlements (user_id, product_id, order_id, granted_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (user_id, product_id)
       DO UPDATE SET order_id = EXCLUDED.order_id, granted_at = NOW()
       RETURNING id, user_id, product_id, order_id, granted_at`,
      [current.buyer_id, current.product_id, current.id]
    );
    await client.query(
      `INSERT INTO seller_earnings
        (seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status)
       VALUES ($1, $2, $3, $4, 0, $4, $5, 'available')
       ON CONFLICT (order_id, product_id) DO NOTHING`,
      [current.seller_id, current.id, current.product_id, current.amount, current.currency]
    );
    await client.query(
      `UPDATE payment_events SET status = 'processed', processed_at = NOW(), order_id = $1 WHERE id = $2`,
      [current.id, event.rows[0].id]
    );
    await client.query('COMMIT');
    return { duplicate: false, order: updated.rows[0], payment: updatedPayment.rows[0], entitlement: entitlement.rows[0] ?? null };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}