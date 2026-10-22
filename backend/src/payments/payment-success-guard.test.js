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

test('rejects settlement when the order provider differs from the webhook provider', () => {
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { id: 'o1', provider: 'stripe', status: 'pending', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-1' },
    provider: 'paypal',
  }), /payment_provider_mismatch/);
});

test('rejects settlement when the payment record provider differs from the webhook provider', () => {
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { id: 'o1', provider: 'stripe', status: 'pending', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: 'o1', provider: 'paypal', status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-1' },
    provider: 'stripe',
  }), /payment_provider_mismatch/);
});

test('rejects non-positive or non-finite settlement amounts', () => {
  const order = { id: 'o1', status: 'pending', amount: '0', currency: 'JPY' };
  const payment = { order_id: 'o1', status: 'succeeded', amount: '0', currency: 'JPY', provider_payment_id: 'pay-1' };
  assert.throws(() => validateSuccessfulPaymentSettlement({ order, payment }), /payment_amount_mismatch/);
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { ...order, amount: '1200' },
    payment: { ...payment, amount: 'Infinity' },
  }), /payment_amount_mismatch/);
});

test('rejects malformed currency codes and blank provider payment IDs', () => {
  const order = { id: 'o1', status: 'pending', amount: '1200', currency: 'JPY' };
  const payment = { order_id: 'o1', status: 'succeeded', amount: '1200', currency: 'undefined', provider_payment_id: 'pay-1' };
  assert.throws(() => validateSuccessfulPaymentSettlement({ order, payment }), /payment_currency_mismatch/);
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { ...order, currency: undefined },
    payment: { ...payment, currency: undefined },
  }), /payment_currency_mismatch/);
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order,
    payment: { ...payment, currency: 'JPY', provider_payment_id: '   ' },
  }), /provider_payment_id_required/);
});

test('accepts matching numeric database order IDs and string webhook IDs', () => {
  assert.equal(validateSuccessfulPaymentSettlement({
    order: { id: 123, status: 'pending', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: '123', status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-123' },
  }), true);
});

test('rejects unsafe numeric order IDs during settlement', () => {
  assert.throws(() => validateSuccessfulPaymentSettlement({
    order: { id: Number.MAX_SAFE_INTEGER + 1, status: 'pending', amount: '1200.00', currency: 'JPY' },
    payment: { order_id: String(Number.MAX_SAFE_INTEGER + 1), status: 'succeeded', amount: '1200.00', currency: 'JPY', provider_payment_id: 'pay-1' },
  }), /payment_order_mismatch/);
});
