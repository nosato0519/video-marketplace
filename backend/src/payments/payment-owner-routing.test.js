import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { configurePaymentProvider, clearPaymentProviderSettings } from './payment-provider-settings.js';
import { resolveOwnerPaymentProvider } from './payment-owner-routing.js';

test('keeps payment routing isolated by owner', async () => {
  const previousKey = process.env.STRIPE_SECRET_KEY;
  const previousSuccess = process.env.STRIPE_SUCCESS_URL;
  const previousCancel = process.env.STRIPE_CANCEL_URL;
  process.env.STRIPE_SECRET_KEY = 'test-owner-routing-key';
  process.env.STRIPE_SUCCESS_URL = 'https://example.com/success';
  process.env.STRIPE_CANCEL_URL = 'https://example.com/cancel';
  const ownerA = crypto.randomUUID();
  const ownerB = crypto.randomUUID();
  try {
    await query(
      `INSERT INTO users (id, email, email_normalized, role, status)
       VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'seller', 'active')`,
      [ownerA, `routing-${ownerA}@test.invalid`, ownerB, `routing-${ownerB}@test.invalid`]
    );
    configurePaymentProvider({ ownerId: ownerA, providerId: 'stripe', region: 'global', currency: 'USD', credentials: { secret: 'owner-a-secret' } });
    configurePaymentProvider({ ownerId: ownerB, providerId: 'stripe', region: 'global', currency: 'USD', credentials: { secret: 'owner-b-secret' } });

    assert.equal((await resolveOwnerPaymentProvider({ ownerId: ownerA })).ownerId, ownerA);
    assert.equal((await resolveOwnerPaymentProvider({ ownerId: ownerB })).ownerId, ownerB);
  } finally {
    clearPaymentProviderSettings({ ownerId: ownerA, providerId: 'stripe' });
    clearPaymentProviderSettings({ ownerId: ownerB, providerId: 'stripe' });
    await query('DELETE FROM users WHERE id IN ($1, $2)', [ownerA, ownerB]).catch(() => {});
    if (previousKey === undefined) delete process.env.STRIPE_SECRET_KEY; else process.env.STRIPE_SECRET_KEY = previousKey;
    if (previousSuccess === undefined) delete process.env.STRIPE_SUCCESS_URL; else process.env.STRIPE_SUCCESS_URL = previousSuccess;
    if (previousCancel === undefined) delete process.env.STRIPE_CANCEL_URL; else process.env.STRIPE_CANCEL_URL = previousCancel;
  }
});

test('does not route an owner through another owner\'s provider configuration', async () => {
  const unknownOwner = crypto.randomUUID();
  await assert.rejects(
    resolveOwnerPaymentProvider({ ownerId: unknownOwner, providerId: 'stripe' }),
    /payment_provider_not_configured_for_owner/
  );
});
