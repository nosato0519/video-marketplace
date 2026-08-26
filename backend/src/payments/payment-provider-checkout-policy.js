import { getPaymentProviderConfig } from './payment-provider-catalog.js';

export function validateProviderCheckout({ providerId, region, currency } = {}) {
  if (!providerId) throw new Error('payment_provider_required');
  const provider = getPaymentProviderConfig(providerId);
  if (!provider) throw new Error(`unsupported_payment_provider:${providerId}`);
  if (region && !provider.regions.includes(region)) {
    throw new Error(`payment_provider_region_unsupported:${providerId}:${region}`);
  }
  if (currency && provider.currencies !== 'multi' && !provider.currencies.includes(String(currency).toUpperCase())) {
    throw new Error(`payment_provider_currency_unsupported:${providerId}:${String(currency).toUpperCase()}`);
  }
  return { providerId: provider.id, valid: true };
}

export function buildProviderCheckoutMetadata({ order, sellerId, providerId } = {}) {
  if (!order?.id) throw new Error('order_required');
  if (!sellerId) throw new Error('payment_owner_required');
  if (!providerId) throw new Error('payment_provider_required');
  return Object.freeze({
    orderId: String(order.id),
    sellerId: String(sellerId),
    providerId: String(providerId),
  });
}
