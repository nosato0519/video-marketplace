import { query } from '../db.js';

export async function findPaymentByOrder({ orderId, provider }) {
  if (!orderId) throw new Error('order_required');
  if (!provider) throw new Error('payment_provider_required');

  const result = await query(
    `SELECT id, order_id, provider, provider_payment_id, amount, currency, status, created_at
       FROM payments
      WHERE order_id = $1
        AND provider = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [orderId, provider]
  );

  return result.rows[0] ?? null;
}

export function validatePaymentRecord({ payment, order }) {
  if (!payment || !order) throw new Error('payment_verification_input_required');
  if (payment.order_id !== order.id) throw new Error('payment_order_mismatch');
  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error('payment_currency_mismatch');
  }
  if (Number(payment.amount) !== Number(order.amount)) throw new Error('payment_amount_mismatch');
  return true;
}
