import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getConfigurablePaymentProviders,
  getPaymentProviderSecretEnv,
  validatePaymentProviderConfig,
} from './payment-provider-config.js';

test('exposes buyer-configurable global and Japan payment providers', () => {
  const providers = getConfigurablePaymentProviders();
  assert.deepEqual(providers.map((provider) => provider.id), [
    'stripe',
    'paypal',
    'adyen',
    'paddle',
    'paypay',
  ]);
  assert.ok(providers.find((provider) => provider.id === 'stripe').regions.includes('global'));
  assert.ok(providers.find((provider) => provider.id === 'paypay').regions.includes('japan'));
});

test('maps providers to buyer-owned secret configuration names', () => {
  assert.equal(getPaymentProviderSecretEnv('stripe'), 'STRIPE_SECRET_KEY');
  assert.equal(getPaymentProviderSecretEnv('paypal'), 'PAYPAL_CLIENT_SECRET');
  assert.equal(getPaymentProviderSecretEnv('adyen'), 'ADYEN_API_KEY');
  assert.equal(getPaymentProviderSecretEnv('paddle'), 'PADDLE_API_KEY');
  assert.equal(getPaymentProviderSecretEnv('paypay'), 'PAYPAY_API_KEY');
  assert.equal(getPaymentProviderSecretEnv('unknown'), null);
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
