import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingPayment } from './payment-ledger.js';

test('requires a pending order and payment provider inputs', async () => {
  await assert.rejects(
    () => createPendingPayment({ order: { id: 'o1', status: 'paid', buyer_id: 'u1', amount: '1000.00', currency: 'JPY' }, provider: 'pending', idempotencyKey: 'order:o1' }),
    /order_not_pending/
  );
  await assert.rejects(
    () => createPendingPayment({ order: { id: 'o1', status: 'pending', buyer_id: 'u1', amount: '1000.00', currency: 'JPY' }, provider: 'pending' }),
    /payment_idempotency_key_required/
  );
});
