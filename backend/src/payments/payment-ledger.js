import { query } from '../db.js';

export function requirePendingPayment(payment) {
  if (!payment) throw new Error('payment_record_not_found');
  if (payment.status !== 'pending') throw new Error('payment_not_pending');
  return payment;
}

export async function createPendingPayment({ order, provider, idempotencyKey }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    throw new Error('payment_idempotency_key_required');
  }

  const result = await query(
    `INSERT INTO payments (order_id, user_id, provider, amount, currency, status, idempotency_key)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)
     ON CONFLICT (order_id, provider)
     DO UPDATE SET idempotency_key = payments.idempotency_key
       WHERE payments.amount = EXCLUDED.amount
         AND payments.currency = EXCLUDED.currency
     RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key, created_at`,
    [order.id, order.buyer_id, provider, order.amount, order.currency, idempotencyKey]
  );

  if (result.rowCount === 0) throw new Error('payment_order_amount_mismatch');
  return requirePendingPayment(result.rows[0]);
}

export async function retryFailedPayment({ order, provider, idempotencyKey }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');
  if (typeof idempotencyKey !== 'string' || idempotencyKey.trim() === '') {
    throw new Error('payment_idempotency_key_required');
  }

  const retryWithNewProviderSession = await query(
    `UPDATE payments
        SET status = 'pending',
            idempotency_key = CASE
              WHEN idempotency_key ~ ':retry:[0-9]+$' THEN
                regexp_replace(
                  idempotency_key,
                  ':retry:[0-9]+$',
                  ':retry:' || ((substring(idempotency_key FROM ':retry:([0-9]+)$'))::integer + 1)::text
                )
              ELSE left($1, 235) || ':retry:1'
            END,
            provider_payment_id = NULL,
            checkout_session_id = NULL
      WHERE order_id = $2
        AND provider = $3
        AND status = 'failed'
        AND provider_payment_id IS NOT NULL
        AND amount = $4
        AND currency = $5
      RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key, created_at`,
    [idempotencyKey, order.id, provider, order.amount, order.currency]
  );
  if (retryWithNewProviderSession.rowCount > 0) return retryWithNewProviderSession.rows[0];

  const retryAfterUnconfirmedProviderResult = await query(
    `UPDATE payments
        SET status = 'pending',
            idempotency_key = CASE
              WHEN idempotency_key ~ ':retry:[0-9]+$' THEN
                regexp_replace(
                  idempotency_key,
                  ':retry:[0-9]+$',
                  ':retry:' || ((substring(idempotency_key FROM ':retry:([0-9]+)$'))::integer + 1)::text
                )
              ELSE left($1, 235) || ':retry:1'
            END,
            checkout_session_id = NULL
      WHERE order_id = $2
        AND provider = $3
        AND status = 'failed'
        AND provider_payment_id IS NULL
        AND amount = $4
        AND currency = $5
      RETURNING id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key, created_at`,
    [idempotencyKey, order.id, provider, order.amount, order.currency]
  );
  if (retryAfterUnconfirmedProviderResult.rowCount > 0) {
    return retryAfterUnconfirmedProviderResult.rows[0];
  }

  return createPendingPayment({ order, provider, idempotencyKey });
}
