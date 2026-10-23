import { getPaymentProviderCatalog, getPaymentProviderConfig } from './payment-provider-catalog.js';

const SECRET_ENV_BY_PROVIDER = Object.freeze({
  stripe: 'STRIPE_SECRET_KEY',
  paypal: 'PAYPAL_CLIENT_SECRET',
});

function isSecureHttpsUrl(value) {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}

export function getConfigurablePaymentProviders() {
  return getPaymentProviderCatalog()
    .filter((config) => config.status === 'available')
    .map((config) => ({
      id: config.id,
      name: config.name,
      regions: [...config.regions],
      currencies: Array.isArray(config.currencies) ? [...config.currencies] : config.currencies,
      status: config.status,
      configured: process.env.PAYMENT_PROVIDER === config.id && (config.id === 'paypal'
        ? Boolean(
          process.env.PAYPAL_CLIENT_ID?.trim() &&
          process.env.PAYPAL_CLIENT_SECRET?.trim() &&
          process.env.PAYPAL_WEBHOOK_ID?.trim() &&
          isSecureHttpsUrl(process.env.PAYPAL_SUCCESS_URL) &&
          isSecureHttpsUrl(process.env.PAYPAL_CANCEL_URL)
        )
        : Boolean(
          process.env.STRIPE_SECRET_KEY?.trim() &&
          process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
          isSecureHttpsUrl(process.env.STRIPE_SUCCESS_URL) &&
          isSecureHttpsUrl(process.env.STRIPE_CANCEL_URL)
        )),
      secretEnv: SECRET_ENV_BY_PROVIDER[config.id],
    }));
}

export function getPaymentProviderSecretEnv(providerId) {
  return SECRET_ENV_BY_PROVIDER[providerId] ?? null;
}

export function validatePaymentProviderConfig({ providerId, credentials }) {
  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);
  if (config.status !== 'available') {
    throw new Error(`payment_provider_adapter_not_ready:${providerId}`);
  }
  if (!credentials || typeof credentials !== 'object') throw new Error('payment_credentials_required');

  const secretEnv = SECRET_ENV_BY_PROVIDER[providerId];
  if (!secretEnv) throw new Error(`payment_provider_config_unsupported:${providerId}`);

  const secret = String(credentials.secret ?? '').trim();
  if (!secret) throw new Error('payment_secret_required');

  return {
    providerId,
    secretEnv,
    regions: [...config.regions],
    configured: true,
  };
}
