import test from 'node:test';
import assert from 'node:assert/strict';
import { retryFailedPayment } from './payment-ledger.js';

test('rejects retry when the order is no longer pending', async () => {
  await assert.rejects(
    () => retryFailedPayment({
      order: { id: 'o1', buyer_id: 'u1', amount: '1000.00', currency: 'JPY', status: 'paid' },
      provider: 'pending',
      idempotencyKey: 'order:o1:retry:1',
    }),
    /order_not_pending/
  );
});

test('requires an idempotency key for retries', async () => {
  await assert.rejects(
    () => retryFailedPayment({
      order: { id: 'o1', buyer_id: 'u1', amount: '1000.00', currency: 'JPY', status: 'pending' },
      provider: 'pending',
    }),
    /payment_idempotency_key_required/
  );
});
