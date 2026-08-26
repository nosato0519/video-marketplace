import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePaymentProvider } from './payment-provider-settings.js';
import { resolveOwnerPaymentProvider } from './payment-owner-routing.js';

test('keeps payment routing isolated by owner', () => {
  configurePaymentProvider({
    ownerId: 'owner-a',
    providerId: 'stripe',
    region: 'global',
    currency: 'USD',
    credentials: { secret: 'owner-a-secret' },
  });

  configurePaymentProvider({
    ownerId: 'owner-b',
    providerId: 'stripe',
    region: 'global',
    currency: 'USD',
    credentials: { secret: 'owner-b-secret' },
  });

  assert.equal(resolveOwnerPaymentProvider({ ownerId: 'owner-a' }).ownerId, 'owner-a');
  assert.equal(resolveOwnerPaymentProvider({ ownerId: 'owner-b' }).ownerId, 'owner-b');
});

test('does not route an owner through another owner\'s provider configuration', () => {
  assert.throws(
    () => resolveOwnerPaymentProvider({ ownerId: 'unknown-owner', providerId: 'stripe' }),
    /payment_provider_not_configured_for_owner/
  );
});
