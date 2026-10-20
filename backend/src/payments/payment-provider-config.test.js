import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConfigurablePaymentProviders,
  getPaymentProviderSecretEnv,
  validatePaymentProviderConfig,
} from './payment-provider-config.js';

test('exposes only implemented payment providers for configuration', () => {
  const providers = getConfigurablePaymentProviders();
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe']);
  assert.ok(providers.find((provider) => provider.id === 'stripe').regions.includes('global'));
  assert.equal(providers.find((provider) => provider.id === 'stripe').status, 'available');
});

test('maps the implemented provider to its server-side secret name', () => {
  assert.equal(getPaymentProviderSecretEnv('stripe'), 'STRIPE_SECRET_KEY');
  assert.equal(getPaymentProviderSecretEnv('paypal'), null);
  assert.equal(getPaymentProviderSecretEnv('adyen'), null);
  assert.equal(getPaymentProviderSecretEnv('paddle'), null);
  assert.equal(getPaymentProviderSecretEnv('paypay'), null);
  assert.equal(getPaymentProviderSecretEnv('unknown'), null);
});

test('rejects credentials for providers without an implemented adapter', () => {
  assert.throws(
    () => validatePaymentProviderConfig({ providerId: 'paypal', credentials: { secret: 'not-used' } }),
    /payment_provider_adapter_not_ready:paypal/
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
