import test from 'node:test';
import assert from 'node:assert/strict';
import {
  configurePaymentProvider,
  getPaymentProviderSettings,
  clearPaymentProviderSettings,
} from './payment-provider-settings.js';

test('configures a buyer-owned provider without returning credentials', () => {
  const result = configurePaymentProvider({
    providerId: 'stripe',
    region: 'global',
    currency: 'USD',
    credentials: { secret: 'buyer-secret' },
  });

  assert.equal(result.providerId, 'stripe');
  assert.equal(result.status, 'configured');
  assert.equal(result.currency, 'USD');
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'secret'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'credentials'), false);

  const stored = getPaymentProviderSettings('stripe');
  assert.equal(stored.providerId, 'stripe');
  assert.equal(Object.prototype.hasOwnProperty.call(stored, 'secret'), false);

  clearPaymentProviderSettings('stripe');
});

test('rejects a provider outside the selected region', () => {
  assert.throws(
    () => configurePaymentProvider({
      providerId: 'paypay',
      region: 'global',
      currency: 'JPY',
      credentials: { secret: 'buyer-secret' },
    }),
    /payment_provider_region_unsupported:paypay:global/
  );
});
