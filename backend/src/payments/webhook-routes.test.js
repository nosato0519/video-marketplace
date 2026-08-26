import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import crypto from 'node:crypto';
import http from 'node:http';
import { registerPaymentWebhookRoutes } from './webhook-routes.js';

async function withServer(run, dependencies = {}) {
  const app = express();
  registerPaymentWebhookRoutes(app, dependencies);
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: { code: 'INTERNAL_ERROR' } });
  });

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();

  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

function sign(body) {
  return crypto.createHmac('sha256', 'test-secret').update(body).digest('hex');
}

test('rejects a webhook with an invalid signature at the HTTP boundary', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-payment-signature': 'invalid' },
      body: JSON.stringify({ eventId: 'evt_123', provider: 'test', eventType: 'payment_succeeded', paymentId: 'pay_123', orderId: 'order_123', amount: 1000, currency: 'JPY', status: 'succeeded' }),
    });
    assert.equal(response.status, 401);
  });
});

test('rejects malformed JSON with a public validation error', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
  const body = '{"eventId":"evt_bad"';

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-payment-signature': sign(body) },
      body,
    });
    assert.equal(response.status, 400);
  });
});

test('processes a valid payment_succeeded webhook through the completion boundary', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
  const calls = [];
  const recordPaymentEvent = async (input) => { calls.push(['record', input]); return { duplicate: false }; };
  const completePayment = async (input) => { calls.push(['complete', input]); return { duplicate: false, order: { id: input.orderId, status: 'paid' } }; };
  const payload = { eventId: 'evt_success_1', provider: 'test', eventType: 'payment_succeeded', paymentId: 'pay_success_1', orderId: 'order_123', amount: 1000, currency: 'JPY', status: 'succeeded' };
  const body = JSON.stringify(payload);

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-payment-signature': sign(body) }, body });
    assert.equal(response.status, 200);
  }, { recordPaymentEvent, completePayment });

  assert.equal(calls.length, 2);
  assert.equal(calls[1][0], 'complete');
});

test('does not complete a duplicate webhook event', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
  let recordCalls = 0;
  let completeCalls = 0;
  const recordPaymentEvent = async () => {
    recordCalls += 1;
    return { duplicate: recordCalls > 1 };
  };
  const completePayment = async () => {
    completeCalls += 1;
    return { duplicate: false };
  };
  const payload = { eventId: 'evt_duplicate_http_1', provider: 'test', eventType: 'payment_succeeded', paymentId: 'pay_duplicate_1', orderId: 'order_123', amount: 1000, currency: 'JPY', status: 'succeeded' };
  const body = JSON.stringify(payload);
  const headers = { 'content-type': 'application/json', 'x-payment-signature': sign(body) };

  await withServer(async (baseUrl) => {
    const first = await fetch(`${baseUrl}/api/payments/webhook`, { method: 'POST', headers, body });
    const second = await fetch(`${baseUrl}/api/payments/webhook`, { method: 'POST', headers, body });
    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    assert.deepEqual(await second.json(), { received: true, duplicate: true });
  }, { recordPaymentEvent, completePayment });

  assert.equal(recordCalls, 2);
  assert.equal(completeCalls, 1);
});
