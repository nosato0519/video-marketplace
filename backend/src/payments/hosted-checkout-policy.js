import { getPaymentProviderConfig } from './payment-provider-catalog.js';

export function getCheckoutMode({ providerId } = {}) {
  if (!providerId) throw new Error('payment_provider_required');
  const provider = getPaymentProviderConfig(providerId);
  return provider?.status === 'available' ? 'provider_hosted' : 'provider_unavailable';
}

export function buildHostedCheckoutResponse({ providerId, checkout } = {}) {
  if (getCheckoutMode({ providerId }) !== 'provider_hosted') {
    throw new Error(`payment_provider_checkout_unavailable:${providerId}`);
  }
  if (!checkout?.url) throw new Error('checkout_url_missing');
  if (
    (typeof checkout.orderId !== 'string' && typeof checkout.orderId !== 'number') ||
    !String(checkout.orderId).trim()
  ) {
    throw new Error('checkout_order_id_missing');
  }

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
