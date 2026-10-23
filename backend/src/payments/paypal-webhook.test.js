import test from 'node:test';
import assert from 'node:assert/strict';
import { createPayPalWebhookHandler } from './paypal-webhook.js';

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function withPayPalEnvironment(callback) {
  const names = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.PAYPAL_CLIENT_ID = 'sandbox-client';
  process.env.PAYPAL_CLIENT_SECRET = 'sandbox-secret';
  process.env.PAYPAL_WEBHOOK_ID = 'sandbox-webhook-id';
  return Promise.resolve().then(callback).finally(() => {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  });
}

function requestFor(event) {
  const headers = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api-m.sandbox.paypal.com/cert',
    'paypal-transmission-id': 'transmission-1',
    'paypal-transmission-sig': 'signature',
    'paypal-transmission-time': '2026-10-23T00:00:00Z',
  };
  return {
    body: Buffer.from(JSON.stringify(event)),
    get(name) { return headers[String(name).toLowerCase()]; },
  };
}

test('PayPal approval webhook captures once and settles the matching order', async () => {
  await withPayPalEnvironment(async () => {
    const event = {
      id: 'WH-ORDER-APPROVED-1',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: 'PAYPAL-ORDER-1' },
    };
    const calls = [];
    let settled;
    const handler = createPayPalWebhookHandler({
      apiRequest: async (path, options = {}) => {
        calls.push({ path, options });
        if (path === '/v1/notifications/verify-webhook-signature') return { verification_status: 'SUCCESS' };
        if (path === '/v2/checkout/orders/PAYPAL-ORDER-1/capture') return { status: 'COMPLETED' };
        if (path === '/v2/checkout/orders/PAYPAL-ORDER-1') {
          return {
            id: 'PAYPAL-ORDER-1',
            purchase_units: [{
              custom_id: 'order-1',
              payments: { captures: [{
                id: 'PAYPAL-CAPTURE-1',
                status: 'COMPLETED',
                amount: { value: '12.50', currency_code: 'USD' },
              }] },
            }],
          };
        }
        throw new Error('unexpected_api_request');
      },
      recordPaymentEvent: async (input) => ({ duplicate: false, input }),
      completePayment: async (input) => { settled = input; return { paid: true }; },
    });
    const res = responseRecorder();
    await handler(requestFor(event), res, (error) => { throw error; });

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.result.paid, true);
    assert.equal(calls.filter((call) => call.path.endsWith('/capture')).length, 1);
    assert.equal(settled.provider, 'paypal');
    assert.equal(settled.providerPaymentId, 'PAYPAL-CAPTURE-1');
    assert.equal(settled.checkoutSessionId, 'PAYPAL-ORDER-1');
    assert.equal(settled.orderId, 'order-1');
    assert.equal(settled.payment.amount, 12.5);
    assert.equal(settled.payment.currency, 'USD');
  });
});

test('PayPal approval webhook surfaces capture failures when no completed capture exists', async () => {
  await withPayPalEnvironment(async () => {
    const event = {
      id: 'WH-ORDER-APPROVED-CAPTURE-FAIL',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: 'PAYPAL-ORDER-CAPTURE-FAIL' },
    };
    const handler = createPayPalWebhookHandler({
      apiRequest: async (path) => {
        if (path === '/v1/notifications/verify-webhook-signature') return { verification_status: 'SUCCESS' };
        if (path.endsWith('/capture')) throw new Error('paypal_api_request_failed');
        if (path === '/v2/checkout/orders/PAYPAL-ORDER-CAPTURE-FAIL') {
          return { purchase_units: [{ custom_id: 'order-capture-fail', payments: { captures: [] } }] };
        }
        throw new Error('unexpected_api_request');
      },
      recordPaymentEvent: async () => { throw new Error('must_not_record_unsettled_payment'); },
      completePayment: async () => { throw new Error('must_not_settle_unsettled_payment'); },
    });
    const res = responseRecorder();
    let forwardedError = null;
    await handler(requestFor(event), res, (error) => { forwardedError = error; });

    assert.equal(res.body, null);
    assert.equal(forwardedError?.message, 'paypal_api_request_failed');
  });
});

test('PayPal webhook rejects an unverified event before capture or settlement', async () => {
  await withPayPalEnvironment(async () => {
    const event = {
      id: 'WH-ORDER-APPROVED-2',
      event_type: 'CHECKOUT.ORDER.APPROVED',
      resource: { id: 'PAYPAL-ORDER-2' },
    };
    const paths = [];
    const handler = createPayPalWebhookHandler({
      apiRequest: async (path) => {
        paths.push(path);
        return { verification_status: 'FAILURE' };
      },
      recordPaymentEvent: async () => { throw new Error('should_not_record'); },
      completePayment: async () => { throw new Error('should_not_settle'); },
    });
    const res = responseRecorder();
    await handler(requestFor(event), res, (error) => { throw error; });

    assert.equal(res.statusCode, 401);
    assert.equal(paths.length, 1);
    assert.deepEqual(res.body.error.code, 'INVALID_WEBHOOK_SIGNATURE');
  });
});
