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

  let checkoutUrl;
  try {
    checkoutUrl = new URL(checkout.url);
  } catch {
    throw new Error('checkout_url_invalid');
  }
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.username || checkoutUrl.password) {
    throw new Error('checkout_url_must_be_secure');
  }

  return Object.freeze({
    mode: 'provider_hosted',
    providerId,
    url: checkoutUrl.toString(),
    orderId: checkout.orderId,
    paymentId: checkout.paymentId ?? null,
  });
}
