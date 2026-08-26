import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';

export function validatePendingOrder({ user, product, existingActiveEntitlement = false }) {
  if (!user) throw new Error('authentication_required');
  if (!product || product.status !== 'published') throw new Error('not_found');
  if (product.seller_id === user.id) throw new Error('seller_cannot_purchase_own_product');
  if (existingActiveEntitlement) throw new Error('already_purchased');

  const amount = Number(product.price_amount);
  if (!Number.isFinite(amount) || amount < 0) throw new Error('invalid_product_price');
  if (!product.price_currency) throw new Error('invalid_product_currency');

  return {
    buyerId: user.id,
    productId: product.id,
    amount,
    currency: product.price_currency,
    status: ORDER_STATES.PENDING,
  };
}

export async function createPendingOrder({ user, product, existingActiveEntitlement = false }) {
  const input = validatePendingOrder({ user, product, existingActiveEntitlement });

  const result = await query(
    `INSERT INTO orders (buyer_id, product_id, amount, currency, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, buyer_id, product_id, amount, currency, status, created_at`,
    [input.buyerId, input.productId, input.amount, input.currency, input.status]
  );

  return result.rows[0];
}

export function buildCheckoutReference({ order }) {
  if (!order || order.status !== ORDER_STATES.PENDING) throw new Error('order_not_pending');
  return { orderId: order.id, amount: order.amount, currency: order.currency };
}
