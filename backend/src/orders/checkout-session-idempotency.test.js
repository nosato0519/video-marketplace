import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldReuseCheckout } from './checkout-session-idempotency.js';

test('reuses created checkout sessions', () => {
  assert.equal(shouldReuseCheckout({ status: 'created' }), true);
});

test('reuses pending checkout sessions', () => {
  assert.equal(shouldReuseCheckout({ status: 'pending' }), true);
});

test('does not reuse terminal checkout sessions', () => {
  assert.equal(shouldReuseCheckout({ status: 'completed' }), false);
  assert.equal(shouldReuseCheckout({ status: 'failed' }), false);
  assert.equal(shouldReuseCheckout(null), false);
});
