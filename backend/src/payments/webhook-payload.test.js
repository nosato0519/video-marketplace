import test from 'node:test';
import assert from 'node:assert/strict';
import { validateWebhookPayload } from './webhook-payload.js';

const basePayload = {
  eventId: 'evt_123',
  provider: 'test',
  eventType: 'payment_succeeded',
  paymentId: 'pay_123',
  orderId: 'order_123',
  amount: 1000,
  currency: 'JPY',
  status: 'succeeded',
};

test('accepts a valid payment_succeeded payload', () => {
  assert.deepEqual(validateWebhookPayload(basePayload), basePayload);
});

test('rejects missing order id', () => {
  assert.throws(() => validateWebhookPayload({ ...basePayload, orderId: '' }), /invalid_webhook_orderId/);
});

test('rejects invalid amount', () => {
  assert.throws(() => validateWebhookPayload({ ...basePayload, amount: '1000' }), /invalid_webhook_amount/);
});

test('rejects invalid currency', () => {
  assert.throws(() => validateWebhookPayload({ ...basePayload, currency: 'JPYJP' }), /invalid_webhook_currency/);
});

test('rejects unsuccessful payment status', () => {
  assert.throws(() => validateWebhookPayload({ ...basePayload, status: 'pending' }), /invalid_webhook_status/);
});

test('rejects unsupported event type', () => {
  assert.throws(() => validateWebhookPayload({ ...basePayload, eventType: 'unknown' }), /unsupported_webhook_event_type/);
});
