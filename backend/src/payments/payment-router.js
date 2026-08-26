import { getPaymentProviderConfig } from './payment-provider-catalog.js';
import { getPaymentProviderSettings } from './payment-provider-settings.js';
import { createPaymentProvider } from './payment-provider.js';

/**
 * Resolves the provider selected by a marketplace operator without ever
 * accepting raw card data. The provider adapter remains responsible for the
 * actual payment operation.
 */
export function resolvePaymentProvider({ providerId, region = 'global', currency = null } = {}) {
  if (!providerId) throw new Error('payment_provider_required');

  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);
  if (!config.regions.includes(region)) {
    throw new Error(`payment_provider_region_unsupported:${providerId}:${region}`);
  }
  if (currency && config.currencies !== 'multi' && !config.currencies.includes(String(currency).toUpperCase())) {
    throw new Error(`payment_provider_currency_unsupported:${providerId}:${String(currency).toUpperCase()}`);
  }

  const setting = getPaymentProviderSettings(providerId);
  if (!setting) throw new Error(`payment_provider_not_configured:${providerId}`);

  const adapter = createPaymentProvider({ provider: providerId });
  if (!adapter.configured) throw new Error(`payment_provider_adapter_not_ready:${providerId}`);

  return {
    providerId,
    region,
    currency: currency ? String(currency).toUpperCase() : null,
    adapter,
  };
}
