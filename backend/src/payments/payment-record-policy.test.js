import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePaymentRecord } from './payment-record-policy.js';

test('accepts a payment record matching its order', () => {
  assert.equal(validatePaymentRecord({
    order: { id: 'o1', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', amount: '1200.00', currency: 'JPY' },
  }), true);
});

test('rejects payment records with mismatched order, amount, or currency', () => {
  assert.throws(() => validatePaymentRecord({
    order: { id: 'o1', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o2', amount: '1200.00', currency: 'JPY' },
  }), /payment_order_mismatch/);

  assert.throws(() => validatePaymentRecord({
    order: { id: 'o1', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', amount: '1300.00', currency: 'JPY' },
  }), /payment_amount_mismatch/);

  assert.throws(() => validatePaymentRecord({
    order: { id: 'o1', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', amount: '1200.00', currency: 'USD' },
  }), /payment_currency_mismatch/);
});
