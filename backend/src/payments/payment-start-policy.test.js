import test from 'node:test';
import assert from 'node:assert/strict';
import { buildPaymentRecordInput } from './payment-start-policy.js';

test('builds a pending payment record from a pending order', () => {
  assert.deepEqual(buildPaymentRecordInput({
    order: {
      id: 'o1', buyer_id: 'b1', product_id: 'p1',
      amount: '1200.00', currency: 'jpy', status: 'pending',
    },
    provider: 'stripe',
  }), {
    orderId: 'o1', buyerId: 'b1', productId: 'p1', amount: 1200,
    currency: 'JPY', provider: 'stripe', providerPaymentId: null,
    status: 'pending', idempotencyKey: 'order:o1',
  });
});

test('rejects non-pending orders', () => {
  assert.throws(() => buildPaymentRecordInput({
    order: { id: 'o1', buyer_id: 'b1', product_id: 'p1', amount: '1200', currency: 'JPY', status: 'paid' },
    provider: 'stripe',
  }), /order_not_pending/);
});
