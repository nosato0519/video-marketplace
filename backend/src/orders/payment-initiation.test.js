import test from 'node:test';
import assert from 'node:assert/strict';
import { ensurePaymentForPendingOrder } from './payment-initiation.js';

test('builds a canonical payment initiation payload', async () => {
  const payload = await ensurePaymentForPendingOrder({
    order: {
      id: 'order-1',
      buyer_id: 'buyer-1',
      product_id: 'product-1',
      amount: '1200.00',
      currency: 'JPY',
      status: 'pending',
    },
  });

  assert.equal(payload.orderId, 'order-1');
  assert.equal(payload.provider, 'pending');
  assert.equal(payload.idempotencyKey, 'order:order-1');
  assert.equal(payload.reference.orderId, 'order-1');
});

test('rejects non-pending orders', async () => {
  await assert.rejects(
    () => ensurePaymentForPendingOrder({
      order: {
        id: 'order-1',
        buyer_id: 'buyer-1',
        status: 'paid',
      },
    }),
    /order_not_pending/
  );
});
