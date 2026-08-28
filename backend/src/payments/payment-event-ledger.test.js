import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPaymentEvent } from './payment-event-ledger.js';

// The production ledger uses the real database helper. Integration checks run
// only when a test database is explicitly configured.

test('rejects an incomplete payment event before touching the database', async () => {
  await assert.rejects(
    recordPaymentEvent({
      provider: 'test',
      eventId: '',
      eventType: 'payment_succeeded',
      providerPaymentId: 'pay_1',
      payloadHash: 'hash_1',
    }),
    /invalid_payment_event/
  );
});

test('duplicate event ids are handled by the database idempotency constraint', { skip: !process.env.DATABASE_URL }, async () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const event = {
    provider: 'test',
    eventId: `evt_test_${suffix}`,
    eventType: 'payment_succeeded',
    providerPaymentId: `pay_test_${suffix}`,
    payloadHash: 'hash_test',
    orderId: null,
  };

  const first = await recordPaymentEvent(event);
  const second = await recordPaymentEvent(event);

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
});

test('rejects reuse of an event id when the payload hash changes', { skip: !process.env.DATABASE_URL }, async () => {
  const suffix = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  const event = {
    provider: 'test',
    eventId: `evt_tamper_${suffix}`,
    eventType: 'payment_succeeded',
    providerPaymentId: `pay_tamper_${suffix}`,
    payloadHash: 'original_hash',
    orderId: null,
  };

  await recordPaymentEvent(event);

  await assert.rejects(
    recordPaymentEvent({ ...event, payloadHash: 'tampered_hash' }),
    /payment_event_payload_mismatch/
  );
});