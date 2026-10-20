import test from 'node:test';
import assert from 'node:assert/strict';
import { createPaymentProvider } from './payment-provider.js';
import { fromStripeMinorUnits, stripeCurrencyMinorUnitFactor, toStripeMinorUnits } from './stripe-money.js';

test('uses an explicit pending provider when no provider is configured', () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  assert.equal(provider.name, 'pending');
  assert.equal(provider.configured, false);
});

test('pending provider rejects a missing idempotency key', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  await assert.rejects(
    () => provider.createCheckout({ orderId: 'o1', amount: '1000.00', currency: 'JPY', metadata: { orderId: 'o1' } }),
    /checkout_idempotency_key_required/
  );
});

test('pending provider rejects mismatched order metadata', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  await assert.rejects(
    () => provider.createCheckout({
      orderId: 'o1',
      amount: '1000.00',
      currency: 'JPY',
      idempotencyKey: 'order:o1',
      metadata: { orderId: 'o2' },
    }),
    /checkout_order_mismatch/
  );
});

test('rejects an unknown provider', () => {
  assert.throws(
    () => createPaymentProvider({ provider: 'unknown' }),
    /unsupported_payment_provider:unknown/
  );
});

test('requires Stripe credentials before exposing Stripe checkout', () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  const previousWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_SECRET_KEY;
  try {
    assert.throws(
      () => createPaymentProvider({ provider: 'stripe' }),
      /payment_provider_not_configured/
    );
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
    if (previousWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhook;
  }
});

test('does not enable Stripe checkout without a webhook signing secret', () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  const previousWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    assert.throws(
      () => createPaymentProvider({ provider: 'stripe' }),
      /payment_provider_not_configured:stripe/
    );
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
    if (previousWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhook;
  }
});

test('Stripe checkout validates its payment metadata and currency before the API call', async () => {
  const previous = process.env.STRIPE_SECRET_KEY;
  const previousWebhook = process.env.STRIPE_WEBHOOK_SECRET;
  const previousSuccess = process.env.STRIPE_SUCCESS_URL;
  const previousCancel = process.env.STRIPE_CANCEL_URL;
  process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.STRIPE_SUCCESS_URL = 'https://example.com/success';
  process.env.STRIPE_CANCEL_URL = 'https://example.com/cancel';
  try {
    const provider = createPaymentProvider({ provider: 'stripe' });
    await assert.rejects(
      () => provider.createCheckout({
        orderId: 'o1',
        amount: '1000.00',
        currency: 'INVALID',
        idempotencyKey: 'order:o1',
        metadata: { orderId: 'o1', paymentId: 'p1' },
      }),
      /checkout_currency_invalid/
    );
  } finally {
    if (previous === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = previous;
    if (previousWebhook === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = previousWebhook;
    if (previousSuccess === undefined) delete process.env.STRIPE_SUCCESS_URL;
    else process.env.STRIPE_SUCCESS_URL = previousSuccess;
    if (previousCancel === undefined) delete process.env.STRIPE_CANCEL_URL;
    else process.env.STRIPE_CANCEL_URL = previousCancel;
  }
});

test('Stripe currency conversion matches checkout and webhook units', () => {
  assert.equal(stripeCurrencyMinorUnitFactor('USD'), 100);
  assert.equal(toStripeMinorUnits('12.34', 'USD'), 1234);
  assert.equal(fromStripeMinorUnits(1234, 'USD'), 12.34);
  assert.equal(stripeCurrencyMinorUnitFactor('JPY'), 1);
  assert.equal(toStripeMinorUnits(1500, 'JPY'), 1500);
  assert.equal(fromStripeMinorUnits(1500, 'JPY'), 1500);
  assert.equal(stripeCurrencyMinorUnitFactor('KWD'), 1000);
  assert.equal(toStripeMinorUnits('1.234', 'KWD'), 1234);
  assert.equal(fromStripeMinorUnits(1234, 'KWD'), 1.234);
  assert.equal(stripeCurrencyMinorUnitFactor('ISK'), 100);
  assert.equal(toStripeMinorUnits(5, 'ISK'), 500);
  assert.equal(fromStripeMinorUnits(500, 'ISK'), 5);
  assert.equal(stripeCurrencyMinorUnitFactor('UGX'), 100);
  assert.equal(toStripeMinorUnits(5, 'UGX'), 500);
  assert.equal(fromStripeMinorUnits(500, 'UGX'), 5);
});

test('rejects checkout amounts that exceed currency precision instead of rounding', () => {
  assert.throws(() => toStripeMinorUnits('12.345', 'USD'), /checkout_amount_precision_invalid/);
  assert.throws(() => toStripeMinorUnits('1500.5', 'JPY'), /checkout_amount_precision_invalid/);
  assert.throws(() => toStripeMinorUnits('1.2345', 'KWD'), /checkout_amount_precision_invalid/);
  assert.throws(() => toStripeMinorUnits('5.5', 'ISK'), /checkout_amount_precision_invalid/);
  assert.throws(() => toStripeMinorUnits('5.5', 'UGX'), /checkout_amount_precision_invalid/);
  assert.throws(() => fromStripeMinorUnits(550, 'ISK'), /stripe_amount_precision_invalid/);
  assert.throws(() => fromStripeMinorUnits(550, 'UGX'), /stripe_amount_precision_invalid/);
});
