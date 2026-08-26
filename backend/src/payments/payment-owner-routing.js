import { getPaymentProviderSettings } from './payment-provider-settings.js';
import { createPaymentProvider } from './payment-provider.js';

export function resolveOwnerPaymentProvider({ ownerId, providerId, region, currency } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');

  const settings = getPaymentProviderSettings(ownerId);
  const selected = settings.find((setting) =>
    (!providerId || setting.providerId === providerId) &&
    (!region || setting.region === region) &&
    (!currency || !setting.currency || setting.currency === String(currency).toUpperCase())
  );

  if (!selected) throw new Error('payment_provider_not_configured_for_owner');

  const provider = createPaymentProvider({ provider: selected.providerId });
  if (!provider.configured) {
    throw new Error(`payment_provider_adapter_not_ready:${selected.providerId}`);
  }

  return {
    ownerId,
    providerId: selected.providerId,
    provider,
    region: selected.region,
    currency: selected.currency,
  };
}

export function resolveProviderForOrder({ order, product, providerId } = {}) {
  if (!order) throw new Error('order_required');
  if (!product) throw new Error('product_required');
  if (String(order.product_id) !== String(product.id)) throw new Error('order_product_mismatch');

  return resolveOwnerPaymentProvider({
    ownerId: product.seller_id,
    providerId,
    currency: order.currency,
  });
}
