import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerPaymentWebhookRoutes } from './webhook-routes.js';

async function withServer(run) {
  const app = express();
  registerPaymentWebhookRoutes(app);
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
        eventId: 'evt_123',
        provider: 'test',
        eventType: 'payment_succeeded',
        paymentId: 'pay_123',
        orderId: 'order_123',
        amount: 1000,
        currency: 'JPY',
        status: 'succeeded',
      }),
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), {
      error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' },
    });
  });
});
