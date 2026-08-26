import test from 'node:test';
import assert from 'node:assert/strict';
import { recordPaymentEvent } from './payment-event-ledger.js';

const originalQuery = globalThis.__paymentLedgerQuery;

test('records the first payment event', async () => {
  const calls = [];
  globalThis.__paymentLedgerQuery = async (sql, params) => {
    calls.push({ sql, params });
    return { rows: [{ id: 1, status: 'pending' }] };
  };

  const result = await recordPaymentEvent({
    provider: 'test',
    eventId: 'evt_1',
    eventType: 'payment_succeeded',
    providerPaymentId: 'pay_1',
    payloadHash: 'hash_1',
    orderId: 'order_1',
  });

  assert.equal(result.duplicate, false);
  assert.equal(calls.length, 1);
});

test('treats an existing provider event id as a duplicate', async () => {
  globalThis.__paymentLedgerQuery = async () => ({ rows: [] });

  const result = await recordPaymentEvent({
    provider: 'test',
    eventId: 'evt_duplicate',
    eventType: 'payment_succeeded',
    providerPaymentId: 'pay_1',
    payloadHash: 'hash_1',
    orderId: 'order_1',
  });

  assert.equal(result.duplicate, true);
});

test('rejects an incomplete event', async () => {
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

globalThis.__paymentLedgerQuery = originalQuery;
