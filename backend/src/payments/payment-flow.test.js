import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPaymentAgainstOrder } from './payment-verification.js';

const order = {
  id: 'order_123',
  amount: 1200,
  currency: 'JPY',
};

test('payment flow accepts matching successful payment', () => {
  const payment = {
    orderId: 'order_123',
    amount: 1200,
    currency: 'JPY',
    status: 'succeeded',
  };

  assert.equal(verifyPaymentAgainstOrder({ payment, order }), true);
});

test('payment flow rejects a forged amount even when status is succeeded', () => {
  const payment = {
    orderId: 'order_123',
    amount: 1,
    currency: 'JPY',
    status: 'succeeded',
  };

  assert.throws(
    () => verifyPaymentAgainstOrder({ payment, order }),
    /payment_amount_mismatch/
  );
});
