import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPayPalAmount, getPayPalApiBaseUrl, paypalApiRequest } from './paypal-api.js';

test('formats PayPal amounts using the currency minor unit', () => {
  assert.equal(formatPayPalAmount('125.50', 'USD'), '125.50');
  assert.equal(formatPayPalAmount('125', 'JPY'), '125');
  assert.equal(formatPayPalAmount('1.234', 'KWD'), '1.234');
});

test('rejects amounts that cannot be charged', () => {
  assert.throws(() => formatPayPalAmount(0, 'USD'), /checkout_amount_invalid/);
  assert.throws(() => formatPayPalAmount('not-a-number', 'USD'), /checkout_amount_invalid/);
  assert.throws(() => formatPayPalAmount(1, 'US'), /checkout_currency_invalid/);
});

test('defaults to PayPal sandbox and only uses live API when explicitly selected', () => {
  assert.equal(getPayPalApiBaseUrl('sandbox'), 'https://api-m.sandbox.paypal.com');
  assert.equal(getPayPalApiBaseUrl('live'), 'https://api-m.paypal.com');
  assert.equal(getPayPalApiBaseUrl(undefined), 'https://api-m.sandbox.paypal.com');
});


test('normalizes PayPal request timeouts into a retryable service error', async () => {
  const names = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENVIRONMENT'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  process.env.PAYPAL_CLIENT_ID = 'sandbox-client';
  process.env.PAYPAL_CLIENT_SECRET = 'sandbox-secret';
  process.env.PAYPAL_ENVIRONMENT = 'sandbox';
  try {
    await assert.rejects(
      () => paypalApiRequest('/v2/checkout/orders', {
        fetchImpl: async () => { throw new DOMException('request timed out', 'TimeoutError'); },
      }),
      (error) => error.message === 'paypal_api_timeout' && error.statusCode === 503
    );
    await assert.rejects(
      () => paypalApiRequest('/v2/checkout/orders', {
        fetchImpl: async () => ({
          ok: true,
          status: 200,
          json: async () => { throw new DOMException('response body timed out', 'TimeoutError'); },
        }),
      }),
      (error) => error.message === 'paypal_api_timeout' && error.statusCode === 503
    );
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});

test('PayPal OAuth diagnostics report whitespace from the original environment values', async () => {
  const names = ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_ENVIRONMENT'];
  const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
  const originalError = console.error;
  const logs = [];
  process.env.PAYPAL_CLIENT_ID = ' sandbox-client ';
  process.env.PAYPAL_CLIENT_SECRET = ' sandbox-secret ';
  process.env.PAYPAL_ENVIRONMENT = 'sandbox';
  console.error = (...args) => logs.push(args);
  try {
    await assert.rejects(
      () => paypalApiRequest('/v1/test', {
        fetchImpl: async () => new Response(JSON.stringify({
          error: 'invalid_client',
          error_description: 'Client Authentication failed',
        }), { status: 401, headers: { 'content-type': 'application/json' } }),
      }),
      /paypal_authentication_failed/
    );
    const diagnostic = logs.find(([message]) => message === 'PayPal OAuth token request failed')?.[1];
    assert.equal(diagnostic.clientIdHadWhitespace, true);
    assert.equal(diagnostic.clientSecretHadWhitespace, true);
    assert.equal(diagnostic.clientIdLength, 'sandbox-client'.length);
    assert.equal(diagnostic.clientSecretLength, 'sandbox-secret'.length);
  } finally {
    console.error = originalError;
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});
