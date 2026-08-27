import test from 'node:test';
import assert from 'node:assert/strict';
import { configurePaymentProvider, clearPaymentProviderSettings } from './payment-provider-settings.js';
import { resolveOwnerPaymentProvider } from './payment-owner-routing.js';

test('keeps payment routing isolated by owner', () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousSuccess = process.env.STRIPE_SUCCESS_URL;
  const previousCancel = process.env.STRIPE_CANCEL_URL;
  process.env.STRIPE_SECRET_KEY = 'sk_test_owner_routing_placeholder';
  process.env.STRIPE_SUCCESS_URL = 'https://example.com/success';
  process.env.STRIPE_CANCEL_URL = 'https://example.com/cancel';
  try {
    configurePaymentProvider({ ownerId: 'owner-a', providerId: 'stripe', region: 'global', currency: 'USD', credentials: { secret: 'owner-a-secret' } });
    configurePaymentProvider({ ownerId: 'owner-b', providerId: 'stripe', region: 'global', currency: 'USD', credentials: { secret: 'owner-b-secret' } });

    assert.equal(resolveOwnerPaymentProvider({ ownerId: 'owner-a' }).ownerId, 'owner-a');
    assert.equal(resolveOwnerPaymentProvider({ ownerId: 'owner-b' }).ownerId, 'owner-b');
  } finally {
    clearPaymentProviderSettings({ ownerId: 'owner-a', providerId: 'stripe' });
    clearPaymentProviderSettings({ ownerId: 'owner-b', providerId: 'stripe' });
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousSuccess === undefined) delete process.env.STRIPE_SUCCESS_URL; else process.env.STRIPE_SUCCESS_URL = previousSuccess;
    if (previousCancel === undefined) delete process.env.STRIPE_CANCEL_URL; else process.env.STRIPE_CANCEL_URL = previousCancel;
  }
});

test('does not route an owner through another owner\'s provider configuration', () => {
  assert.throws(() => resolveOwnerPaymentProvider({ ownerId: 'unknown-owner', providerId: 'stripe' }), /payment_provider_not_configured_for_owner/);
});