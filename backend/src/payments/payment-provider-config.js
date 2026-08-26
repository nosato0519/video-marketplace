import { getPaymentProviderConfig } from './payment-provider-catalog.js';

const SECRET_ENV_BY_PROVIDER = Object.freeze({
  stripe: 'STRIPE_SECRET_KEY',
  paypal: 'PAYPAL_CLIENT_SECRET',
  adyen: 'ADYEN_API_KEY',
  paddle: 'PADDLE_API_KEY',
  paypay: 'PAYPAY_API_KEY',
});

export function getConfigurablePaymentProviders() {
  return [
    'stripe',
    'paypal',
    'adyen',
    'paddle',
    'paypay',
  ].map((id) => {
    const config = getPaymentProviderConfig(id);
    return {
      id,
      name: config.name,
      regions: [...config.regions],
      currencies: Array.isArray(config.currencies) ? [...config.currencies] : config.currencies,
      configured: Boolean(process.env[SECRET_ENV_BY_PROVIDER[id]]),
      secretEnv: SECRET_ENV_BY_PROVIDER[id],
    };
  });
}

export function getPaymentProviderSecretEnv(providerId) {
  return SECRET_ENV_BY_PROVIDER[providerId] ?? null;
}

export function validatePaymentProviderConfig({ providerId, credentials }) {
  const config = getPaymentProviderConfig(providerId);
  if (!config) throw new Error(`unsupported_payment_provider:${providerId}`);
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
