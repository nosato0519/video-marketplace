import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePaymentProvider, getPaymentProviderSettings, clearPaymentProviderSettings } from './payment-provider-settings.js';

test('configures a buyer-owned provider without returning credentials', () => {
  const result = configurePaymentProvider({ ownerId: 'buyer-1', providerId: 'stripe', region: 'global', currency: 'USD', credentials: { secret: 'buyer-secret' } });
  assert.equal(result.providerId, 'stripe');
  assert.equal(result.status, 'configured');
  assert.equal(result.currency, 'USD');
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'secret'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result, 'credentials'), false);

  const stored = getPaymentProviderSettings('buyer-1');
  assert.equal(stored.length, 1);
  assert.equal(stored[0].providerId, 'stripe');
  assert.equal(Object.prototype.hasOwnProperty.call(stored[0], 'secret'), false);

  assert.equal(clearPaymentProviderSettings({ ownerId: 'buyer-1', providerId: 'stripe' }), true);
});

test('rejects a provider outside the selected region', () => {
  assert.throws(
    () => configurePaymentProvider({ ownerId: 'buyer-1', providerId: 'paypay', region: 'global', currency: 'JPY', credentials: { secret: 'buyer-secret' } }),
    /payment_provider_region_unsupported:paypay:global/
  );
});