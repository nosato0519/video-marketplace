export function createCheckoutSession({ order, provider }) {
  if (!order || order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider || typeof provider.createCheckout !== 'function') throw new Error('payment_provider_unavailable');

  return provider.createCheckout({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    metadata: { orderId: order.id },
  });
}

export function normalizeProviderPayment({ providerPaymentId, checkoutUrl }) {
  if (!providerPaymentId || !checkoutUrl) throw new Error('invalid_provider_checkout');
  return {
    providerPaymentId: String(providerPaymentId),
    checkoutUrl: String(checkoutUrl),
  };
}
