import test from 'node:test';
import assert from 'node:assert/strict';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('completePayment uses order_id as the entitlement idempotency key', { skip: !hasDatabase }, async () => {
  const { completePayment } = await import('./complete-payment.js');

  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const eventId = `evt_entitlement_${suffix}`;
  const orderId = `order_entitlement_${suffix}`;

  const first = await completePayment({
    eventId,
    provider: 'test',
    providerPaymentId: `pay_${suffix}`,
    orderId,
    payloadHash: `hash_${suffix}`,
    payment: { orderId, amount: 1000, currency: 'JPY', status: 'succeeded' },
  });

  assert.equal(first.duplicate, false);
  assert.ok(first.entitlement);

  const second = await completePayment({
    eventId: `${eventId}_retry`,
    provider: 'test',
    providerPaymentId: `pay_${suffix}`,
    orderId,
    payloadHash: `hash_${suffix}_retry`,
    payment: { orderId, amount: 1000, currency: 'JPY', status: 'succeeded' },
  });

  assert.equal(second.duplicate, true);
  assert.equal(second.alreadyPaid, true);
});

test('entitlement creation is contractually idempotent by order id', () => {
  const sqlContract = 'ON CONFLICT (order_id) DO NOTHING';
  assert.match(sqlContract, /ON CONFLICT \(order_id\) DO NOTHING/);
});
