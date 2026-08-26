import { query } from '../db.js';

export async function createPendingPayment({ order, provider, idempotencyKey }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');
  if (!idempotencyKey) throw new Error('payment_idempotency_key_required');

  const result = await query(
    `INSERT INTO payments (order_id, user_id, provider, amount, currency, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     ON CONFLICT (order_id, provider)
     DO UPDATE SET idempotency_key = payments.idempotency_key
     RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key, created_at`,
    [order.id, order.buyer_id, provider, order.amount, order.currency, idempotencyKey]
  );

  return result.rows[0];
}
