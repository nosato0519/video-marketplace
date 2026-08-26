import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCheckoutIdempotencyKey, shouldReuseCheckout } from './checkout-session-idempotency.js';

test('builds a stable checkout idempotency key from the order', () => {
  assert.equal(buildCheckoutIdempotencyKey({ orderId: 'order-1' }), 'order:order-1');
});

test('rejects a missing order id', () => {
  assert.throws(() => buildCheckoutIdempotencyKey({ orderId: null }), /order_required/);
});

test('reuses created or pending checkout sessions when a provider returns one', () => {
  assert.equal(shouldReuseCheckout({ status: 'created' }), true);
  assert.equal(shouldReuseCheckout({ status: 'pending' }), true);
});

test('does not reuse terminal checkout sessions', () => {
  assert.equal(shouldReuseCheckout({ status: 'completed' }), false);
  assert.equal(shouldReuseCheckout({ status: 'failed' }), false);
  assert.equal(shouldReuseCheckout(null), false);
});
