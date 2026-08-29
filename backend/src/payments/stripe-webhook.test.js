import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import Stripe from 'stripe';
import { createStripeWebhookHandler } from './stripe-webhook.js';

const secret = 'whsec_test_secret';
const stripe = new Stripe('sk_test_webhook_verifier');

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
        metadata: { orderId: 'order_123', paymentId: 'pi_test_1' },
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
  const signature = stripe.webhooks.generateTestHeaderString(body, secret);

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
  const signature = stripe.webhooks.generateTestHeaderString(body, secret);

  await withServer(handler, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/stripe/webhook`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body,
    });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, ignored: true });
  });
  assert.equal(recordCalls, 0);
});
