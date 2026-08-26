import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProviderCheckout, buildProviderCheckoutMetadata } from './payment-provider-checkout-policy.js';

test('validates a global provider and currency', () => {
  assert.deepEqual(
    validateProviderCheckout({ providerId: 'stripe', region: 'global', currency: 'USD' }),
    { providerId: 'stripe', valid: true }
  );
});

test('rejects a Japan-only provider for global checkout', () => {
  assert.throws(
    () => validateProviderCheckout({ providerId: 'paypay', region: 'global', currency: 'JPY' }),
    /payment_provider_region_unsupported:paypay:global/
  );
});

test('builds safe checkout metadata without credentials', () => {
  const metadata = buildProviderCheckoutMetadata({
    order: { id: 'order-1' },
    sellerId: 'seller-1',
    providerId: 'stripe',
  });
  assert.deepEqual(metadata, { orderId: 'order-1', sellerId: 'seller-1', providerId: 'stripe' });
  assert.equal(Object.isFrozen(metadata), true);
});
