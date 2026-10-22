import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPaymentAgainstOrder } from './payment-verification.js';

const order = {
  id: 'order_123',
  amount: 1000,
  currency: 'JPY',
};

const payment = {
  orderId: 'order_123',
  amount: 1000,
  currency: 'JPY',
  status: 'succeeded',
};

test('accepts payment matching the order exactly', () => {
  assert.equal(verifyPaymentAgainstOrder({ payment, order }), true);
});

test('rejects a payment with a mismatched amount', () => {
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment: { ...payment, amount: 1001 }, order }),
    /payment_amount_mismatch/
  );
});

test('rejects a payment with a mismatched currency', () => {
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment: { ...payment, currency: 'USD' }, order }),
    /payment_currency_mismatch/
  );
});

test('rejects a payment for another order', () => {
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment: { ...payment, orderId: 'order_other' }, order }),
    /payment_order_mismatch/
  );
});

test('rejects missing order identifiers instead of treating them as a match', () => {
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment: { ...payment, orderId: undefined }, order: { ...order, id: undefined } }),
    /payment_order_id_required/
  );
});

test('rejects missing or malformed currency codes', () => {
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment: { ...payment, currency: undefined }, order }),
    /payment_currency_invalid/
  );
  assert.throws(
    () => verifyPaymentAgainstOrder({ payment, order: { ...order, currency: 'JP' } }),
    /payment_currency_invalid/
  );
});
