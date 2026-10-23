import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConfigurablePaymentProviders,
  getPaymentProviderSecretEnv,
  validatePaymentProviderConfig,
} from './payment-provider-config.js';

test('exposes only implemented payment providers for configuration', () => {
  const providers = getConfigurablePaymentProviders();
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe', 'paypal']);
  assert.ok(providers.find((provider) => provider.id === 'stripe').regions.includes('global'));
  assert.equal(providers.find((provider) => provider.id === 'stripe').status, 'available');
});


test('reports Stripe configured when enabled and all secrets and URLs exist', () => {
  const names = ['PAYMENT_PROVIDER', 'PAYMENT_PROVIDERS_ENABLED', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID', 'PAYPAL_SUCCESS_URL', 'PAYPAL_CANCEL_URL'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  try {
    process.env.STRIPE_SECRET_KEY = 'placeholder-secret-value';
    process.env.STRIPE_WEBHOOK_SECRET = 'placeholder-webhook-value';
    process.env.STRIPE_SUCCESS_URL = 'https://example.com/success';
    process.env.STRIPE_CANCEL_URL = 'https://example.com/cancel';
    process.env.PAYPAL_CLIENT_ID = 'placeholder-paypal-client';
    process.env.PAYPAL_CLIENT_SECRET = 'placeholder-paypal-secret';
    process.env.PAYPAL_WEBHOOK_ID = 'placeholder-paypal-webhook';
    process.env.PAYPAL_SUCCESS_URL = 'https://example.com/success';
    process.env.PAYPAL_CANCEL_URL = 'https://example.com/cancel';
    delete process.env.PAYMENT_PROVIDER;
    delete process.env.PAYMENT_PROVIDERS_ENABLED;
    assert.equal(getConfigurablePaymentProviders()[0].configured, false);
    process.env.PAYMENT_PROVIDER = 'stripe';
    assert.equal(getConfigurablePaymentProviders()[0].configured, true);
    process.env.PAYMENT_PROVIDERS_ENABLED = 'paypal';
    assert.equal(getConfigurablePaymentProviders()[0].configured, false);
    process.env.PAYMENT_PROVIDERS_ENABLED = 'stripe,paypal';
    const providers = getConfigurablePaymentProviders();
    assert.equal(providers.find((provider) => provider.id === 'stripe').enabled, true);
    assert.equal(providers.find((provider) => provider.id === 'stripe').configured, true);
    assert.equal(providers.find((provider) => provider.id === 'paypal').enabled, true);
    assert.equal(providers.find((provider) => provider.id === 'paypal').configured, true);
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('maps the implemented provider to its server-side secret name', () => {
  assert.equal(getPaymentProviderSecretEnv('stripe'), 'STRIPE_SECRET_KEY');
  assert.equal(getPaymentProviderSecretEnv('paypal'), 'PAYPAL_CLIENT_SECRET');
  assert.equal(getPaymentProviderSecretEnv('adyen'), null);
  assert.equal(getPaymentProviderSecretEnv('paddle'), null);
  assert.equal(getPaymentProviderSecretEnv('paypay'), null);
  assert.equal(getPaymentProviderSecretEnv('unknown'), null);
});

test('rejects credentials for providers without an implemented adapter', () => {
  assert.throws(
    () => validatePaymentProviderConfig({ providerId: 'adyen', credentials: { secret: 'not-used' } }),
    /payment_provider_adapter_not_ready:adyen/
  );
});

test('validates buyer-provided provider credentials without persisting them', () => {
  const result = validatePaymentProviderConfig({
    providerId: 'stripe',
    credentials: { secret: 'buyer-owned-secret' },
  });
  assert.equal(result.providerId, 'stripe');
  assert.equal(result.secretEnv, 'STRIPE_SECRET_KEY');
  assert.equal(result.configured, true);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'secret'), false);
});
