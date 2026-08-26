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

test('rejects a webhook with an invalid signature at the HTTP boundary', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-payment-signature': 'invalid',
      },
      body: JSON.stringify({
        eventId: 'evt_123', provider: 'test', eventType: 'payment_succeeded',
        paymentId: 'pay_123', orderId: 'order_123', amount: 1000, currency: 'JPY', status: 'succeeded',
      }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' },
    });
  });
});

test('processes a valid payment_succeeded webhook through the completion boundary', async () => {
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-secret';
  const calls = [];
  const recordPaymentEvent = async (input) => {
    calls.push(['record', input]);
    return { duplicate: false };
  };
  const completePayment = async (input) => {
    calls.push(['complete', input]);
    return { duplicate: false, order: { id: input.orderId, status: 'paid' } };
  };

  const payload = {
    eventId: 'evt_success_1', provider: 'test', eventType: 'payment_succeeded',
    paymentId: 'pay_success_1', orderId: 'order_123', amount: 1000, currency: 'JPY', status: 'succeeded',
  };
  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', 'test-secret').update(body).digest('hex');

  await withServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/payments/webhook`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-payment-signature': signature },
      body,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      received: true,
      result: { duplicate: false, order: { id: 'order_123', status: 'paid' } },
    });
  }, { recordPaymentEvent, completePayment });

  assert.equal(calls.length, 2);
  assert.equal(calls[0][0], 'record');
  assert.equal(calls[1][0], 'complete');
  assert.equal(calls[1][1].payment.amount, 1000);
  assert.equal(calls[1][1].payment.currency, 'JPY');
});
