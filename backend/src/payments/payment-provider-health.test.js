import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePaymentProvider } from './payment-provider-settings.js';
import { getOwnerPaymentProviderHealth } from './payment-provider-health.js';

test('reports provider readiness without exposing credentials', () => {
  configurePaymentProvider({
    ownerId: 'health-owner',
    providerId: 'stripe',
    region: 'global',
    currency: 'USD',
    credentials: { secret: 'do-not-return-this' },
  });

  const health = getOwnerPaymentProviderHealth('health-owner');
  assert.equal(health.length, 1);
  assert.equal(health[0].providerId, 'stripe');
  assert.equal(health[0].status, 'configuration_error');
  assert.equal('credentials' in health[0], false);
  assert.equal('secret' in health[0], false);
});
