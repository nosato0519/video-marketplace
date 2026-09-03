import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { query } from '../db.js';
import {
  configurePaymentProvider,
  getPaymentProviderSettings,
  getPersistedPaymentProviderSettings,
  persistPaymentProviderSettings,
  clearPaymentProviderSettings,
} from './payment-provider-settings.js';

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

test('persists seller provider settings without storing credentials', async (t) => {
  if (!process.env.DATABASE_URL) {
    t.skip('DATABASE_URL is not configured');
    return;
  }

  const ownerId = crypto.randomUUID();
  await query(
    `INSERT INTO users (id, email, email_normalized, role, status)
     VALUES ($1, $2, $2, 'seller', 'active')`,
    [ownerId, `provider-settings-${ownerId}@test.invalid`]
  );

  try {
    const configured = configurePaymentProvider({
      ownerId,
      providerId: 'stripe',
      region: 'global',
      currency: 'USD',
      credentials: { secret: 'not-persisted' },
    });
    const persisted = await persistPaymentProviderSettings(configured);
    assert.equal(persisted.ownerId, ownerId);
    assert.equal(persisted.providerId, 'stripe');
    assert.equal(Object.prototype.hasOwnProperty.call(persisted, 'secret'), false);

    clearPaymentProviderSettings({ ownerId, providerId: 'stripe' });
    const restored = await getPersistedPaymentProviderSettings(ownerId);
    assert.equal(restored.length, 1);
    assert.equal(restored[0].ownerId, ownerId);
    assert.equal(restored[0].providerId, 'stripe');
    assert.equal(restored[0].secretEnv, 'STRIPE_SECRET_KEY');
    assert.equal(Object.prototype.hasOwnProperty.call(restored[0], 'credentials'), false);
  } finally {
    clearPaymentProviderSettings({ ownerId, providerId: 'stripe' });
    await query('DELETE FROM seller_payment_provider_settings WHERE owner_id = $1', [ownerId]).catch(() => {});
    await query('DELETE FROM users WHERE id = $1', [ownerId]).catch(() => {});
  }
});
