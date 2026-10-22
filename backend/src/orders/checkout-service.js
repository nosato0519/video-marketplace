import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { buildCheckoutReference } from './create-order-policy.js';
import { buildCheckoutIdempotencyKey } from './checkout-session-idempotency.js';
import { createPaymentProvider } from '../payments/payment-provider.js';
import { retryFailedPayment } from '../payments/payment-ledger.js';

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

export async function createCheckoutSession({ orderId, userId }) {
  const order = await getPendingOrderForCheckout({ orderId, userId });
  if (!order) throw new Error('order_not_found');

  const selectedProvider = process.env.PAYMENT_PROVIDER;
  if (!selectedProvider) throw new Error('payment_provider_required');

  const provider = createPaymentProvider({ provider: selectedProvider });
  if (!provider.configured) {
    throw new Error(`payment_provider_adapter_not_ready:${provider.name}`);
  }

  const reference = buildCheckoutReference({ order });
  const idempotencyKey = buildCheckoutIdempotencyKey({ orderId: order.id });
  const payment = await retryFailedPayment({
    order,
    provider: provider.name,
    idempotencyKey,
  });

  if (
    Number(payment.amount) !== Number(order.amount) ||
    String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()
  ) {
    throw new Error('payment_order_amount_mismatch');
  }

  const checkout = await provider.createCheckout({
    orderId: order.id,
    amount: payment.amount,
    currency: payment.currency,
    idempotencyKey: payment.idempotency_key,
    metadata: {
      orderId: order.id,
      reference,
      paymentId: payment.id,
      sellerId: order.seller_id,
      providerId: provider.name,
    },
  });

  if (checkout.sessionId) {
    const savedSession = await query(
      `UPDATE payments
          SET checkout_session_id = $1
        WHERE id = $2
          AND provider = $3
          AND status = 'pending'
          AND (checkout_session_id IS NULL OR checkout_session_id = $1)
        RETURNING id`,
      [checkout.sessionId, payment.id, provider.name]
    );
    if (savedSession.rowCount !== 1) {
      throw new Error('checkout_session_persistence_failed');
    }
  }

  return checkout;
}
