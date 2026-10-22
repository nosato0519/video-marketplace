import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import Stripe from 'stripe';
import { createStripeWebhookHandler } from './stripe-webhook.js';

const secret = 'test-webhook-signing-secret';
const stripe = new Stripe('test-webhook-verifier-key');

async function withServer(handler, run) {
  const app = express();
  app.post('/api/payments/stripe/webhook', express.raw({ type: 'application/json', limit: '1mb' }), handler);
  app.use((error, _req, res, _next) => res.status(500).json({ error: error.message }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try { return await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((e) => e ? reject(e) : resolve())); }
}

function makeEvent(overrides = {}) {
  return {
    id: 'evt_stripe_1',
    object: 'event',
    api_version: '2025-06-30.basil',
    created: 1770000000,
    livemode: false,
    pending_webhooks: 1,
    type: 'checkout.session.completed',
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        client_reference_id: 'order_123',
        amount_total: 1000,
        currency: 'jpy',
        payment_intent: 'pi_test_1',
        payment_status: 'paid',
        metadata: { orderId: 'order_123', paymentId: 'internal_payment_row_123' },
      },
    },
    ...overrides,
  };
}

test('accepts a valid Stripe signature and normalizes checkout completion', async () => {
  const calls = [];
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async (input) => { calls.push(['record', input]); return { duplicate: false }; },
    completePayment: async (input) => { calls.push(['complete', input]); return { duplicate: false }; },
    failPayment: async () => { throw new Error('should_not_fail'); },
  });
  const body = JSON.stringify(makeEvent());
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
  });

  assert.equal(calls[0][0], 'record');
  assert.equal(calls[0][1].provider, 'stripe');
  assert.equal(calls[0][1].eventId, 'evt_stripe_1');
  assert.equal(calls[1][0], 'complete');
  assert.equal(calls[1][1].orderId, 'order_123');
  assert.equal(calls[1][1].providerPaymentId, 'pi_test_1');
});

test('ignores a completed Checkout session until Stripe reports it paid', async () => {
  let recordCalls = 0;
  const event = makeEvent();
  event.data.object.payment_status = 'unpaid';
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => { throw new Error('must_not_complete'); },
    failPayment: async () => {},
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, ignored: true, reason: 'payment_not_paid' });
  });
  assert.equal(recordCalls, 0);
});

test('ignores async Checkout success until payment status is paid', async () => {
  let recordCalls = 0;
  let completeCalls = 0;
  const event = makeEvent({
    id: 'evt_async_unpaid',
    type: 'checkout.session.async_payment_succeeded',
  });
  event.data.object.payment_status = 'unpaid';
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => { completeCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true, ignored: true, reason: 'payment_not_paid',
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(completeCalls, 0);
});

test('rejects webhook requests that were not parsed as raw bytes', async () => {
  const handler = createStripeWebhookHandler({ secret, stripe });
  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'text/plain', 'stripe-signature': 'unused' },
      body: 'not raw JSON',
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK_BODY', message: 'Webhook body must be raw JSON bytes' },
    });
  });
});

test('rejects an invalid Stripe signature before settlement', async () => {
  let completeCalls = 0;
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { throw new Error('must_not_record'); },
    completePayment: async () => { completeCalls += 1; },
    failPayment: async () => {},
  });
  const body = JSON.stringify(makeEvent());

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=bad' }, body,
    });
    assert.equal(response.status, 401);
  });
  assert.equal(completeCalls, 0);
});

test('ignores unsupported Stripe event types without touching the payment ledger', async () => {
  let recordCalls = 0;
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => {},
    failPayment: async () => {},
  });
  const body = JSON.stringify(makeEvent({ type: 'customer.updated' }));
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, ignored: true });
  });
  assert.equal(recordCalls, 0);
});

test('retries settlement when a duplicate event is still pending', async () => {
  let completeCalls = 0;
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => ({
      duplicate: true,
      event: { status: 'pending' },
    }),
    completePayment: async () => { completeCalls += 1; return { duplicate: false }; },
    failPayment: async () => { throw new Error('should_not_fail'); },
  });
  const body = JSON.stringify(makeEvent());
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
  });
  assert.equal(completeCalls, 1);
});


test('ignores partial refund events without changing payment state', async () => {
  let refundCalls = 0;
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { throw new Error('partial_refund_must_not_be_recorded'); },
    refundPayment: async () => { refundCalls += 1; },
  });
  const event = makeEvent({
    type: 'charge.refunded',
    data: { object: {
      id: 'ch_test_partial',
      object: 'charge',
      amount: 1000,
      currency: 'jpy',
      refunded: false,
      payment_intent: 'pi_test_1',
      metadata: { orderId: 'order_123' },
    } },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true, ignored: true, reason: 'partial_refund_not_supported',
    });
  });
  assert.equal(refundCalls, 0);
});

test('routes a full refund event to the refund settlement handler', async () => {
  const calls = [];
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async (input) => { calls.push(['record', input]); return { duplicate: false }; },
    refundPayment: async (input) => { calls.push(['refund', input]); return { duplicate: false }; },
  });
  const event = makeEvent({
    type: 'charge.refunded',
    data: { object: {
      id: 'ch_test_full',
      object: 'charge',
      amount: 1000,
      currency: 'jpy',
      refunded: true,
      payment_intent: 'pi_test_1',
      metadata: { orderId: 'order_123' },
    } },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
  });

  assert.equal(calls[0][0], 'record');
  assert.equal(calls[0][1].eventType, 'payment_refunded');
  assert.equal(calls[1][0], 'refund');
  assert.equal(calls[1][1].providerPaymentId, 'pi_test_1');
  assert.equal(calls[1][1].orderId, 'order_123');
});


test('does not run refund settlement again for an already processed Stripe event', async () => {
  let refundCalls = 0;
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => ({
      duplicate: true,
      event: { status: 'processed' },
    }),
    refundPayment: async () => { refundCalls += 1; throw new Error('processed_refund_must_not_run_twice'); },
  });
  const event = makeEvent({
    id: 'evt_stripe_refund_processed',
    type: 'charge.refunded',
    data: { object: {
      id: 'ch_test_full',
      object: 'charge',
      amount: 1000,
      currency: 'jpy',
      refunded: true,
      payment_intent: 'pi_test_1',
      metadata: { orderId: 'order_123' },
    } },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, duplicate: true });
  });
  assert.equal(refundCalls, 0);
});


test('returns a client error for a permanent Stripe settlement validation failure', async () => {
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => ({ duplicate: false }),
    completePayment: async () => { throw new Error('payment_amount_mismatch'); },
    failPayment: async () => {},
  });
  const body = JSON.stringify(makeEvent());
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
});


test('returns a client error for an invalid Stripe amount before settlement', async () => {
  const event = makeEvent();
  event.data.object.amount_total = 'not-a-number';
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { throw new Error('must_not_record_invalid_amount'); },
    completePayment: async () => { throw new Error('must_not_settle_invalid_amount'); },
    failPayment: async () => {},
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
});


test('returns a server error for transient Stripe settlement failures so delivery can retry', async () => {
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => ({ duplicate: false }),
    completePayment: async () => { throw new Error('database_connection_lost'); },
    failPayment: async () => {},
  });
  const body = JSON.stringify(makeEvent());
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), { error: 'database_connection_lost' });
  });
});


test('ignores expired Checkout sessions without a payment intent instead of storing the session id as a payment id', async () => {
  let recordCalls = 0;
  let failCalls = 0;
  const event = makeEvent({
    id: 'evt_expired_without_payment_intent',
    type: 'checkout.session.expired',
    data: { object: {
      id: 'cs_expired_without_intent',
      object: 'checkout.session',
      client_reference_id: 'order_123',
      amount_total: 1000,
      currency: 'jpy',
      payment_intent: null,
      payment_status: 'unpaid',
      metadata: { orderId: 'order_123', paymentId: 'internal_payment_row_123' },
    } },
  });
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => { throw new Error('must_not_complete'); },
    failPayment: async () => { failCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true, ignored: true, reason: 'expired_session_without_payment_intent',
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(failCalls, 0);
});


test('rejects a full refund event without a PaymentIntent before recording it', async () => {
  let recordCalls = 0;
  let refundCalls = 0;
  const event = makeEvent({
    id: 'evt_refund_without_payment_intent',
    type: 'charge.refunded',
    data: { object: {
      id: 'ch_refund_without_intent',
      object: 'charge',
      amount: 1000,
      currency: 'jpy',
      refunded: true,
      payment_intent: null,
      metadata: { orderId: 'order_123' },
    } },
  });
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    refundPayment: async () => { refundCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(refundCalls, 0);
});


test('rejects a paid Checkout session without a PaymentIntent before recording or settling it', async () => {
  let recordCalls = 0;
  let completeCalls = 0;
  const event = makeEvent({
    id: 'evt_paid_without_payment_intent',
    type: 'checkout.session.completed',
    data: { object: {
      id: 'cs_paid_without_payment_intent',
      object: 'checkout.session',
      client_reference_id: 'order_123',
      amount_total: 1000,
      currency: 'jpy',
      payment_intent: null,
      payment_status: 'paid',
      metadata: { orderId: 'order_123', paymentId: 'internal_payment_row_123' },
    } },
  });
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => { completeCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(completeCalls, 0);
});

test('routes PaymentIntent success, failure, and cancellation events using the PaymentIntent ID', async (t) => {
  const cases = [
    { type: 'payment_intent.succeeded', eventType: 'payment_succeeded', handler: 'complete' },
    { type: 'payment_intent.payment_failed', eventType: 'payment_failed', handler: 'fail' },
    { type: 'payment_intent.canceled', eventType: 'payment_failed', handler: 'fail' },
  ];

  for (const [index, item] of cases.entries()) {
    await t.test(item.type, async () => {
      const calls = [];
      const event = makeEvent({
        id: `evt_payment_intent_${index}`,
        type: item.type,
        data: { object: {
          id: `pi_direct_${index}`,
          object: 'payment_intent',
          ...(item.type === 'payment_intent.succeeded' ? { amount: 1000, amount_received: 1000, currency: 'jpy' } : {}),
          status: item.type === 'payment_intent.succeeded' ? 'succeeded' : 'requires_payment_method',
          metadata: { orderId: 'order_123', paymentId: 'internal_payment_row_123' },
        } },
      });
      const handler = createStripeWebhookHandler({
        secret,
        stripe,
        recordPaymentEvent: async (input) => { calls.push(['record', input]); return { duplicate: false }; },
        completePayment: async (input) => { calls.push(['complete', input]); return { duplicate: false }; },
        failPayment: async (input) => { calls.push(['fail', input]); return { duplicate: false }; },
      });
      const body = JSON.stringify(event);
      const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

      await withServer(handler, async (baseUrl) => {
        const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'stripe-signature': signature },
          body,
        });
        assert.equal(response.status, 200);
      });

      assert.equal(calls[0][0], 'record');
      assert.equal(calls[0][1].eventType, item.eventType);
      assert.equal(calls[0][1].providerPaymentId, `pi_direct_${index}`);
      assert.equal(calls[0][1].orderId, 'order_123');
      assert.equal(calls[1][0], item.handler);
      assert.equal(calls[1][1].providerPaymentId, `pi_direct_${index}`);
    });
  }
});

test('rejects conflicting Checkout order references before recording or settling', async () => {
  let recordCalls = 0;
  let completeCalls = 0;
  const event = makeEvent();
  event.data.object.client_reference_id = 'order_other';
  const handler = createStripeWebhookHandler({
    secret,
    stripe,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    completePayment: async () => { completeCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(completeCalls, 0);
});

test('rejects refund when Charge and PaymentIntent refer to different orders', async () => {
  let recordCalls = 0;
  let refundCalls = 0;
  const verifier = new Stripe('test-webhook-verifier-key');
  verifier.paymentIntents.retrieve = async () => ({
    id: 'pi_test_1',
    metadata: { orderId: 'order_from_payment_intent' },
  });
  const event = makeEvent({
    id: 'evt_refund_order_mismatch',
    type: 'charge.refunded',
    data: { object: {
      id: 'ch_refund_order_mismatch',
      object: 'charge',
      amount: 1000,
      currency: 'jpy',
      refunded: true,
      payment_intent: 'pi_test_1',
      metadata: { orderId: 'order_from_charge' },
    } },
  });
  const handler = createStripeWebhookHandler({
    secret,
    stripe: verifier,
    recordPaymentEvent: async () => { recordCalls += 1; return { duplicate: false }; },
    refundPayment: async () => { refundCalls += 1; },
  });
  const body = JSON.stringify(event);
  const signature = verifier.webhooks.generateTestHeaderString({ payload: body, secret });

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body,
    });
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' },
    });
  });
  assert.equal(recordCalls, 0);
  assert.equal(refundCalls, 0);
});
