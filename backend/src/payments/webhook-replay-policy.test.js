import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWebhookReplay } from './webhook-replay-policy.js';

test('classifies an identical processed webhook as already processed', () => {
  assert.equal(validateWebhookReplay({
    recordedEvent: {
      provider: 'stripe', event_id: 'evt-1', event_type: 'payment_succeeded',
      provider_payment_id: 'pay-1', order_id: 'order-1', status: 'processed',
    },
    incoming: { provider: 'stripe', eventId: 'evt-1', eventType: 'payment_succeeded', paymentId: 'pay-1', orderId: 'order-1' },
  }), 'already_processed');
});

test('rejects an event id reused with different payload data', () => {
  assert.throws(() => validateWebhookReplay({
    recordedEvent: {
      provider: 'stripe', event_id: 'evt-1', event_type: 'payment_succeeded',
      provider_payment_id: 'pay-1', order_id: 'order-1', status: 'processed',
    },
    incoming: { provider: 'stripe', eventId: 'evt-1', eventType: 'payment_refunded', paymentId: 'pay-1', orderId: 'order-1' },
  }), /payment_event_payload_mismatch/);
});
