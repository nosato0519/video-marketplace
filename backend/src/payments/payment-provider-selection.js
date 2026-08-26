import { getPaymentProviderCatalog, getPaymentProviderConfig } from './payment-provider-catalog.js';

export function listPaymentProviderOptions({ region = 'global', currency = null } = {}) {
  return getPaymentProviderCatalog()
    .filter((provider) => provider.regions.includes(region))
    .filter((provider) => {
      if (!currency || provider.currencies === 'multi') return true;
      return provider.currencies.includes(String(currency).toUpperCase());
    })
    .map(({ id, name, regions, currencies, status }) => ({
      id,
      name,
      regions,
      currencies,
      status,
    }));
}

export function selectPaymentProvider({ providerId, region = 'global', currency = null } = {}) {
  if (!providerId) throw new Error('payment_provider_required');

  const provider = getPaymentProviderConfig(providerId);
  if (!provider) throw new Error(`unsupported_payment_provider:${providerId}`);
  if (!provider.regions.includes(region)) {
    throw new Error(`payment_provider_region_unsupported:${providerId}:${region}`);
  }
  if (currency && provider.currencies !== 'multi' && !provider.currencies.includes(String(currency).toUpperCase())) {
    throw new Error(`payment_provider_currency_unsupported:${providerId}:${String(currency).toUpperCase()}`);
  }

  return {
    id: provider.id,
    name: provider.name,
    region,
    currency: currency ? String(currency).toUpperCase() : null,
    status: provider.status,
  };
}
