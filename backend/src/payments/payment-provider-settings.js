import { getPaymentProviderConfig } from './payment-provider-catalog.js';
import { getPaymentProviderSecretEnv, validatePaymentProviderConfig } from './payment-provider-config.js';
import { selectPaymentProvider } from './payment-provider-selection.js';

const CONFIGURED_PROVIDERS = new Map();

export function configurePaymentProvider({ ownerId, providerId, region = 'global', currency = null, credentials } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');

  const selection = selectPaymentProvider({ providerId, region, currency });
  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);

  const validated = validatePaymentProviderConfig({ providerId, credentials });
  const key = `${ownerId}:${providerId}`;
  const record = {
    ownerId,
    providerId: selection.id,
    name: selection.name,
    region: selection.region,
    currency: selection.currency,
    status: 'configured',
    secretEnv: getPaymentProviderSecretEnv(providerId),
    configuredAt: new Date().toISOString(),
  };

  // Credentials are deliberately not retained here. Production adapters should resolve
  // the secretEnv through the deployment's secret manager and store only a reference.
  void validated;
  CONFIGURED_PROVIDERS.set(key, record);
  return { ...record };
}

export function getPaymentProviderSettings(ownerId = null) {
  const records = [...CONFIGURED_PROVIDERS.values()];
  const filtered = ownerId ? records.filter((record) => record.ownerId === ownerId) : records;
  return filtered.map((record) => ({ ...record }));
}

export function clearPaymentProviderSettings({ ownerId, providerId } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');
  if (!providerId) throw new Error('payment_provider_required');
  return CONFIGURED_PROVIDERS.delete(`${ownerId}:${providerId}`);
}
