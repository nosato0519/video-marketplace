import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSuccessfulPaymentSettlement } from './payment-success-guard.js';

test('accepts a succeeded payment matching a pending order', () => {
  assert.equal(validateSuccessfulPaymentSettlement({
    order: { id: 'o1', status: 'pending', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-1' },
  }), true);
});

test('rejects settlement when payment record is missing', () => {
  assert.throws(() => validateSuccessfulPaymentSettlement({ order: { id: 'o1' }, payment: null }), /payment_verification_input_required/);
});

test('rejects settlement for a non-pending order', () => {
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { id: 'o1', status: 'paid', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-1' },
  }), /order_not_settleable/);
});
