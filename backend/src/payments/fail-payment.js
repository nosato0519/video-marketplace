import { getPool } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from '../orders/order-state.js';

export async function failPayment({
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
      recordedEvent.event_type !== 'payment_failed' ||
      recordedEvent.provider_payment_id !== providerPaymentId ||
      recordedEvent.payload_hash !== payloadHash ||
      (recordedEvent.order_id ?? null) !== (orderId ?? null)
    ) {
      throw new Error('payment_event_payload_mismatch');
    }

    const order = await client.query(
      `SELECT id, status
         FROM orders
        WHERE id = $1
        FOR UPDATE`,
      [orderId]
    );

    if (order.rowCount === 0) throw new Error('order_not_found');
    const current = order.rows[0];

    const payment = await client.query(
      `SELECT id, order_id, user_id, provider, provider_payment_id, amount, currency, status
         FROM payments
        WHERE order_id = $1 AND provider = $2
        FOR UPDATE`,
      [orderId, provider]
    );

    if (payment.rowCount === 0) throw new Error('payment_record_not_found');
    const currentPayment = payment.rows[0];

    if (currentPayment.provider_payment_id && currentPayment.provider_payment_id !== providerPaymentId) {
      throw new Error('provider_payment_id_mismatch');
    }

    if (current.status === ORDER_STATES.CANCELLED && currentPayment.status === 'failed') {
      await client.query(
        `UPDATE payment_events
            SET status = 'processed', processed_at = NOW()
          WHERE id = $1`,
        [recordedEvent.id]
      );
      await client.query('COMMIT');
      return { duplicate: true, alreadyFailed: true };
    }

    if (!canTransitionOrder(current.status, ORDER_STATES.CANCELLED)) {
      throw new Error('order_not_cancellable');
    }

    const updatedPayment = await client.query(
      `UPDATE payments
          SET provider_payment_id = $1,
              status = 'failed'
        WHERE id = $2
        RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status`,
      [providerPaymentId, currentPayment.id]
    );

    const updatedOrder = await client.query(
      `UPDATE orders
          SET status = 'cancelled',
              provider = $1,
              provider_payment_id = $2,
              updated_at = NOW()
        WHERE id = $3
        RETURNING id, buyer_id, product_id, amount, currency, status, provider, provider_payment_id, updated_at`,
      [provider, providerPaymentId, current.id]
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
      payment: updatedPayment.rows[0],
      order: updatedOrder.rows[0],
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
