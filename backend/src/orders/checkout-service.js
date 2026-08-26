import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { buildCheckoutReference } from './create-order-policy.js';
import { createPaymentProvider } from '../payments/payment-provider.js';

export async function getPendingOrderForCheckout({ orderId, userId }) {
  if (!orderId) throw new Error('order_required');

  const result = await query(
    `SELECT id, buyer_id, product_id, amount, currency, status
       FROM orders
      WHERE id = $1
        AND buyer_id = $2
      LIMIT 1`,
    [orderId, userId]
  );

  const order = result.rows[0] ?? null;
  if (!order) return null;
  if (order.status !== ORDER_STATES.PENDING) throw new Error('order_not_pending');

  return order;
}

export async function createCheckoutSession({ orderId, userId }) {
  const order = await getPendingOrderForCheckout({ orderId, userId });
  if (!order) throw new Error('order_not_found');

  const provider = createPaymentProvider();
  const reference = buildCheckoutReference({ order });

  return provider.createCheckout({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    metadata: { orderId: order.id, reference },
  });
}
