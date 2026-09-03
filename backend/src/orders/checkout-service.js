import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { buildCheckoutReference } from './create-order-policy.js';
import { buildCheckoutIdempotencyKey } from './checkout-session-idempotency.js';
import { resolveProviderForOrder } from '../payments/payment-owner-routing.js';
import { createPendingPayment } from '../payments/payment-ledger.js';

export async function getPendingOrderForCheckout({ orderId, userId }) {
  if (!orderId) throw new Error('order_required');

  const result = await query(
    `SELECT o.id, o.buyer_id, o.product_id, o.amount, o.currency, o.status,
            p.seller_id
       FROM orders o
       JOIN products p ON p.id = o.product_id
      WHERE o.id = $1
        AND o.buyer_id = $2
      LIMIT 1`,
    [orderId, userId]
  );

  const order = result.rows[0] ?? null;
  if (!order) return null;
  if (order.status !== ORDER_STATES.PENDING) throw new Error('order_not_pending');
  if (!order.seller_id) throw new Error('payment_owner_missing');

  return order;
}

export async function createCheckoutSession({ orderId, userId, providerId = null }) {
  const order = await getPendingOrderForCheckout({ orderId, userId });
  if (!order) throw new Error('order_not_found');

  const paymentRoute = await resolveProviderForOrder({
    order,
    product: { id: order.product_id, seller_id: order.seller_id },
    providerId,
  });
  const provider = paymentRoute.provider;
  const reference = buildCheckoutReference({ order });
  const idempotencyKey = buildCheckoutIdempotencyKey({ orderId: order.id });
  const payment = await createPendingPayment({
    order,
    provider: paymentRoute.providerId,
    idempotencyKey,
  });

  try {
    return await provider.createCheckout({
      orderId: order.id,
      amount: payment.amount,
      currency: payment.currency,
      idempotencyKey: payment.idempotency_key,
      metadata: {
        orderId: order.id,
        reference,
        paymentId: payment.id,
        sellerId: order.seller_id,
        providerId: paymentRoute.providerId,
      },
    });
  } catch (error) {
    await query(
      `UPDATE payments
          SET status = 'failed'
        WHERE id = $1
          AND status = 'pending'`,
      [payment.id]
    );
    throw error;
  }
}
