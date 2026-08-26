import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProviderCheckout } from './provider-checkout-policy.js';

test('accepts checkout matching the canonical order', () => {
  assert.equal(validateProviderCheckout({
    order: { id: 'o1', status: 'pending', amount: '1200.00', currency: 'JPY' },
    checkout: { orderId: 'o1', amount: '1200.00', currency: 'JPY', idempotencyKey: 'order:o1' },
  }), true);
});

test('rejects checkout for another order', () => {
  assert.throws(() => validateProviderCheckout({
    order: { id: 'o1', status: 'pending', amount: '1200.00', currency: 'JPY' },
    checkout: { orderId: 'o2', amount: '1200.00', currency: 'JPY', idempotencyKey: 'order:o2' },
  }), /checkout_order_mismatch/);
});

test('rejects amount or currency mismatch', () => {
  assert.throws(() => validateProviderCheckout({
    order: { id: 'o1', status: 'pending', amount: '1200.00', currency: 'JPY' },
    checkout: { orderId: 'o1', amount: '1300.00', currency: 'JPY', idempotencyKey: 'order:o1' },
  }), /checkout_amount_mismatch/);
  assert.throws(() => validateProviderCheckout({
    order: { id: 'o1', status: 'pending', amount: '1200.00', currency: 'JPY' },
    checkout: { orderId: 'o1', amount: '1200.00', currency: 'USD', idempotencyKey: 'order:o1' },
  }), /checkout_currency_mismatch/);
});
