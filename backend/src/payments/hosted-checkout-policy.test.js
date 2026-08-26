import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutMode, buildHostedCheckoutResponse } from './hosted-checkout-policy.js';

test('uses provider-hosted checkout for supported providers', () => {
  assert.equal(getCheckoutMode({ providerId: 'stripe' }), 'provider_hosted');
  assert.equal(getCheckoutMode({ providerId: 'paypal' }), 'provider_hosted');
});

test('returns only safe checkout information', () => {
  const result = buildHostedCheckoutResponse({
    providerId: 'stripe',
    checkout: { url: 'https://checkout.example.test/session', orderId: 'order-1', paymentId: 'payment-1', secret: 'never-return' },
  });
  assert.deepEqual(result, {
    mode: 'provider_hosted',
    providerId: 'stripe',
    url: 'https://checkout.example.test/session',
    orderId: 'order-1',
    paymentId: 'payment-1',
  });
  assert.equal('secret' in result, false);
});
