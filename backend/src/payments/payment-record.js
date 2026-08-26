import { query } from '../db.js';

export async function ensurePendingPayment({ order, provider, providerPaymentId }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');
  if (!providerPaymentId) throw new Error('provider_payment_id_required');

  const result = await query(
    `INSERT INTO payments (order_id, provider, provider_payment_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5, 'pending')
     ON CONFLICT (order_id) DO UPDATE
       SET provider = EXCLUDED.provider,
           provider_payment_id = EXCLUDED.provider_payment_id
     RETURNING id, order_id, provider, provider_payment_id, amount, currency, status, created_at`,
    [order.id, provider, providerPaymentId, order.amount, order.currency]
  );

  return result.rows[0];
}
