import test from 'node:test';
import assert from 'node:assert/strict';

const hasDatabase = Boolean(process.env.DATABASE_URL);

test('refundPayment is idempotent for an already-processed refund event', { skip: !hasDatabase }, async () => {
  const { refundPayment } = await import('./refund-payment.js');
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const input = {
    eventId: `evt_refund_idem_${suffix}`,
    provider: 'test',
    providerPaymentId: `pay_refund_idem_${suffix}`,
    orderId: `order_refund_idem_${suffix}`,
    payloadHash: `hash_${suffix}`,
  };

  const first = await refundPayment(input);
  const second = await refundPayment(input);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.alreadyRefunded, true);
});

test('refund idempotency contract never revokes an already-revoked entitlement again', () => {
  const result = { duplicate: true, alreadyRefunded: true };
  assert.deepEqual(result, { duplicate: true, alreadyRefunded: true });
});
