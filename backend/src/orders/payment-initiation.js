import { query } from '../db.js';
import { buildCheckoutReference } from './create-order-policy.js';

export async function ensurePaymentForPendingOrder({ order, provider = 'pending' }) {
  if (!order || !order.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');

  // The explicit pending adapter is a provider-neutral development/test boundary.
  // It must not require PostgreSQL merely to build the canonical payment payload.
  if (provider === 'pending') {
    return {
      orderId: order.id,
      buyerId: order.buyer_id,
      amount: order.amount,
      currency: order.currency,
      provider,
      idempotencyKey: `order:${order.id}`,
      reference: buildCheckoutReference({ order }),
    };
  }

  const existing = await query(
    `SELECT id, buyer_id, product_id, amount, currency, status, provider, provider_payment_id
       FROM orders
      WHERE id = $1
        AND buyer_id = $2
      LIMIT 1`,
    [order.id, order.buyer_id]
  );

  const current = existing.rows[0] ?? null;
  if (!current) throw new Error('order_not_found');
  if (current.status !== 'pending') throw new Error('order_not_pending');

  return {
    orderId: current.id,
    buyerId: current.buyer_id,
    amount: current.amount,
    currency: current.currency,
    provider,
    idempotencyKey: `order:${current.id}`,
    reference: buildCheckoutReference({ order: current }),
  };
}
