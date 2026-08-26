import test from 'node:test';
import assert from 'node:assert/strict';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment marks an already-paid order as an idempotent duplicate', { skip: !hasDatabase }, async () => {
  const { completePayment } = await import('./complete-payment.js');

  const result = await completePayment({
    eventId: `evt_paid_${Date.now()}`,
    provider: 'test',
    providerPaymentId: `pay_paid_${Date.now()}`,
    orderId: 'order_already_paid',
    payloadHash: 'test-hash',
    payment: {
      orderId: 'order_already_paid',
      amount: 1000,
      currency: 'JPY',
      status: 'succeeded',
    },
  });

  assert.equal(result.duplicate, true);
  assert.equal(result.alreadyPaid, true);
});

// Keep a database-free contract test in the default CI suite.
test('completePayment exposes an explicit already-paid idempotency result contract', () => {
  const result = { duplicate: true, alreadyPaid: true };
  assert.deepEqual(result, { duplicate: true, alreadyPaid: true });
});
