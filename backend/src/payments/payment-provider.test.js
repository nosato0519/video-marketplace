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

test('pending provider rejects blank idempotency keys and unsafe numeric identifiers', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  const base = {
    orderId: 'o1',
    amount: 100,
    currency: 'JPY',
    metadata: { orderId: 'o1', paymentId: 'p1' },
  };
  await assert.rejects(
    () => provider.createCheckout({ ...base, idempotencyKey: '   ' }),
    /checkout_idempotency_key_required/
  );
  await assert.rejects(
    () => provider.createCheckout({ ...base, idempotencyKey: 'k'.repeat(256) }),
    /checkout_idempotency_key_invalid/
  );
  await assert.rejects(
    () => provider.createCheckout({ ...base, orderId: Number.MAX_SAFE_INTEGER + 1, idempotencyKey: 'order:o1' }),
    /checkout_order_id_required/
  );
  await assert.rejects(
    () => provider.createCheckout({
      ...base,
      idempotencyKey: 'order:o1',
      metadata: { orderId: 'o1', paymentId: Number.MAX_SAFE_INTEGER + 1 },
    }),
    /checkout_payment_id_required/
  );
});

test('checkout validation rejects non-scalar amounts and non-string currencies', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  const base = {
    orderId: 'o1',
    amount: 100,
    currency: 'JPY',
    idempotencyKey: 'order:o1',
    metadata: { orderId: 'o1', paymentId: 'p1' },
  };
  for (const amount of [true, [100], {}, '   ']) {
    await assert.rejects(
      () => provider.createCheckout({ ...base, amount }),
      /checkout_amount_invalid/
    );
  }
  for (const currency of [123, ['JPY'], {}]) {
    await assert.rejects(
      () => provider.createCheckout({ ...base, currency }),
      /checkout_currency_invalid/
    );
  }
});

test('rejects invalid or overlong checkout reference metadata', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  const base = {
    orderId: 'o1',
    amount: 100,
    currency: 'JPY',
    idempotencyKey: 'order:o1',
    metadata: { orderId: 'o1', paymentId: 'p1' },
  };
  for (const reference of [' ', 'r'.repeat(501), {}, true]) {
    await assert.rejects(
      () => provider.createCheckout({ ...base, metadata: { ...base.metadata, reference } }),
      /checkout_reference_invalid/
    );
  }
  const valid = await provider.createCheckout({
    ...base,
    metadata: { ...base.metadata, reference: 'r'.repeat(500) },
  });
  assert.equal(valid.status, 'not_configured');
});

test('rejects checkout identifiers that exceed Stripe field limits', async () => {
  const provider = createPaymentProvider({ provider: 'pending' });
  const base = {
    orderId: 'o1',
    amount: 100,
    currency: 'JPY',
    idempotencyKey: 'order:o1',
    metadata: { orderId: 'o1', paymentId: 'p1' },
  };
  await assert.rejects(
    () => provider.createCheckout({ ...base, orderId: 'o'.repeat(256), metadata: { orderId: 'o'.repeat(256), paymentId: 'p1' } }),
    /checkout_order_id_required/
  );
  await assert.rejects(
    () => provider.createCheckout({ ...base, metadata: { orderId: 'o1', paymentId: 'p'.repeat(501) } }),
    /checkout_payment_id_required/
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
    await assert.rejects(
      () => provider.createCheckout({
        orderId: 'o1',
        amount: '1000.00',
        currency: 'INVALID',
        idempotencyKey: 'order:o1',
        metadata: { orderId: 'o1', paymentId: 123 },
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

test('Stripe checkout rejects insecure or malformed redirect URLs', () => {
  const names = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_SUCCESS_URL', 'STRIPE_CANCEL_URL'];
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  process.env.STRIPE_SECRET_KEY = 'test-stripe-key';
  process.env.STRIPE_WEBHOOK_SECRET = 'test-webhook-secret';
  process.env.STRIPE_SUCCESS_URL = 'http://example.com/success';
  process.env.STRIPE_CANCEL_URL = 'https://example.com/cancel';
  try {
    assert.throws(
      () => createPaymentProvider({ provider: 'stripe' }),
      /stripe_redirect_url_must_be_https/
    );
    process.env.STRIPE_SUCCESS_URL = 'https://example.com/success?orderId=stale';
    assert.throws(
      () => createPaymentProvider({ provider: 'stripe' }),
      /stripe_success_url_must_not_include_checkout_parameters/
    );
    process.env.STRIPE_SUCCESS_URL = 'not-a-url';
    assert.throws(
      () => createPaymentProvider({ provider: 'stripe' }),
      /stripe_redirect_url_invalid/
    );
  } finally {
    for (const name of names) {
      if (previous[name] === undefined) delete process.env[name];
      else process.env[name] = previous[name];
    }
  }
});


test('payment provider catalog preserves planned integrations without enabling unimplemented adapters', async () => {
  const { getPaymentProviderCatalog, getPaymentProviderConfig } = await import('./payment-provider-catalog.js');
  const catalog = getPaymentProviderCatalog();
  assert.deepEqual(catalog.map(({ id, status }) => [id, status]), [
    ['stripe', 'available'],
    ['paypal', 'not_implemented'],
    ['adyen', 'not_implemented'],
    ['paddle', 'not_implemented'],
    ['paypay', 'not_implemented'],
  ]);

  const paypal = getPaymentProviderConfig('paypal');
  assert.equal(paypal.name, 'PayPal');
  assert.equal(paypal.status, 'not_implemented');
  paypal.regions.push('test-only');
  assert.deepEqual(getPaymentProviderConfig('paypal').regions, ['global', 'japan']);
  assert.equal(getPaymentProviderConfig('unknown'), null);
});
