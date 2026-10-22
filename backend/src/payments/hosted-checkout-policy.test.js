import test from 'node:test';
import assert from 'node:assert/strict';
import { getCheckoutMode, buildHostedCheckoutResponse } from './hosted-checkout-policy.js';

test('uses provider-hosted checkout for supported providers', () => {
  assert.equal(getCheckoutMode({ providerId: 'stripe' }), 'provider_hosted');
  assert.equal(getCheckoutMode({ providerId: 'paypal' }), 'provider_unavailable');
  assert.equal(getCheckoutMode({ providerId: 'paypay' }), 'provider_unavailable');
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


test('rejects missing or blank hosted checkout order identifiers', () => {
  for (const orderId of [undefined, null, '', '   ']) {
    assert.throws(
      () => buildHostedCheckoutResponse({
        providerId: 'stripe',
        checkout: { url: 'https://checkout.example.test/session', orderId },
      }),
      { message: 'checkout_order_id_missing' }
    );
  }
});

test('rejects insecure or credential-bearing hosted checkout URLs', () => {
  for (const url of [
    'http://checkout.example.test/session',
    'https://user:password@checkout.example.test/session',
  ]) {
    assert.throws(
      () => buildHostedCheckoutResponse({
        providerId: 'stripe',
        checkout: { url, orderId: 'order-1' },
      }),
      { message: 'checkout_url_must_be_secure' }
    );
  }
});
