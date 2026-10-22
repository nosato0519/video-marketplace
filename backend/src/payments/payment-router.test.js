import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePaymentProvider } from './payment-router.js';

test('rejects checkout routing when no provider is selected', () => {
  assert.throws(() => resolvePaymentProvider({}), /payment_provider_required/);
});

test('rejects a provider unavailable to the selected region', () => {
  assert.throws(
    () => resolvePaymentProvider({ providerId: 'paypay', region: 'global', currency: 'USD' }),
    /payment_provider_region_unsupported:paypay:global/
  );
});

test('rejects a region-compatible provider that is not implemented', () => {
  assert.throws(
    () => resolvePaymentProvider({ providerId: 'paypay', region: 'japan', currency: 'JPY' }),
    /payment_provider_adapter_not_ready:paypay/
  );
});

test('requires the selected provider to be configured before checkout routing', () => {
  assert.throws(
    () => resolvePaymentProvider({ providerId: 'stripe', region: 'global', currency: 'USD' }),
    /payment_provider_not_configured:stripe/
  );
});
