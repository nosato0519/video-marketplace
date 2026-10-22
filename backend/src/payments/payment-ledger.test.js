import test from 'node:test';
import assert from 'node:assert/strict';
import { createPendingPayment, requirePendingPayment, retryFailedPayment } from './payment-ledger.js';

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

test('refuses to start checkout from a non-pending payment record', () => {
  assert.throws(() => requirePendingPayment({ id: 'p1', status: 'succeeded' }), /payment_not_pending/);
  assert.throws(() => requirePendingPayment({ id: 'p1', status: 'failed' }), /payment_not_pending/);
  assert.throws(() => requirePendingPayment(null), /payment_record_not_found/);
  const payment = { id: 'p1', status: 'pending' };
  assert.equal(requirePendingPayment(payment), payment);
});

test('retryFailedPayment rejects invalid checkout inputs before accessing the ledger', async () => {
  await assert.rejects(
    () => retryFailedPayment({ order: { id: 'o1', status: 'cancelled' }, provider: 'stripe', idempotencyKey: 'order:o1' }),
    /order_not_pending/
  );
  await assert.rejects(
    () => retryFailedPayment({ order: { id: 'o1', status: 'pending' }, idempotencyKey: 'order:o1' }),
    /payment_provider_required/
  );
  await assert.rejects(
    () => retryFailedPayment({ order: { id: 'o1', status: 'pending' }, provider: 'stripe' }),
    /payment_idempotency_key_required/
  );
});
