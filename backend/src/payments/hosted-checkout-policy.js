const HOSTED_CHECKOUT_PROVIDERS = new Set(['stripe', 'paypal', 'adyen', 'paddle', 'paypay']);

export function getCheckoutMode({ providerId } = {}) {
  if (!providerId) throw new Error('payment_provider_required');
  return HOSTED_CHECKOUT_PROVIDERS.has(providerId) ? 'provider_hosted' : 'provider_unavailable';
}

export function buildHostedCheckoutResponse({ providerId, checkout } = {}) {
  if (getCheckoutMode({ providerId }) !== 'provider_hosted') {
    throw new Error(`payment_provider_checkout_unavailable:${providerId}`);
  }
  if (!checkout?.url) throw new Error('checkout_url_missing');

  return Object.freeze({
    mode: 'provider_hosted',
    providerId,
    url: checkout.url,
    orderId: checkout.orderId,
    paymentId: checkout.paymentId ?? null,
  });
}
