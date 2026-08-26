import { getPaymentProviderConfig } from './payment-provider-catalog.js';
import { getPaymentProviderSecretEnv, validatePaymentProviderConfig } from './payment-provider-config.js';
import { selectPaymentProvider } from './payment-provider-selection.js';

const CONFIGURED_PROVIDERS = new Map();

export function configurePaymentProvider({ providerId, region = 'global', currency = null, credentials } = {}) {
  const selection = selectPaymentProvider({ providerId, region, currency });
  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);

  const validated = validatePaymentProviderConfig({ providerId, credentials });
  const record = {
    providerId: selection.id,
    name: selection.name,
    region: selection.region,
    currency: selection.currency,
    status: 'configured',
    secretEnv: getPaymentProviderSecretEnv(providerId),
    configuredAt: new Date().toISOString(),
  };

  CONFIGURED_PROVIDERS.set(providerId, record);
  return { ...record };
}

export function getPaymentProviderSettings(providerId = null) {
  if (providerId) {
    const record = CONFIGURED_PROVIDERS.get(providerId);
    return record ? { ...record } : null;
  }

  return [...CONFIGURED_PROVIDERS.values()].map((record) => ({ ...record }));
}

export function clearPaymentProviderSettings(providerId) {
  if (!providerId) throw new Error('payment_provider_required');
  return CONFIGURED_PROVIDERS.delete(providerId);
}
