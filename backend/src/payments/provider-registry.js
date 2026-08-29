import { createPaymentProvider } from './payment-provider.js';

export function getPaymentProvider({ provider = process.env.PAYMENT_PROVIDER } = {}) {
  return createPaymentProvider({ provider });
}

export function startProviderCheckout({ order, reference, paymentId, idempotencyKey } = {}) {
  if (!order) throw new Error('order_required');

  const provider = getPaymentProvider();
  if (!provider.configured) {
    throw new Error(`payment_provider_adapter_not_ready:${provider.name}`);
  }

  return provider.createCheckout({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    idempotencyKey,
    metadata: {
      orderId: order.id,
      ...(paymentId ? { paymentId } : {}),
      ...(reference ? { reference } : {}),
      ...(order.seller_id ? { sellerId: order.seller_id } : {}),
      providerId: provider.name,
    },
  });
}
