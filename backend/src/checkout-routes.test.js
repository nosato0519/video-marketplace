import test from 'node:test';
import assert from 'node:assert/strict';
import { checkoutError } from './checkout-routes.js';

test('maps checkout amount mismatch to a conflict response', () => {
  assert.deepEqual(checkoutError(new Error('payment_order_amount_mismatch')), {
    status: 409,
    body: {
      error: {
        code: 'PAYMENT_ORDER_AMOUNT_MISMATCH',
        message: 'The payment amount does not match the order',
      },
    },
  });
});

test('maps checkout session persistence failure to a retryable service response', () => {
  assert.deepEqual(checkoutError(new Error('checkout_session_persistence_failed')), {
    status: 503,
    body: {
      error: {
        code: 'CHECKOUT_SESSION_NOT_SAVED',
        message: 'Checkout could not be safely initialized. Please retry later.',
      },
    },
  });
});

test('rejects a payment method that is not enabled for the site', () => {
  assert.deepEqual(checkoutError(new Error('payment_provider_not_enabled:paypal')), {
    status: 400,
    body: {
      error: {
        code: 'PAYMENT_PROVIDER_NOT_ENABLED',
        message: 'That payment method is not enabled for this site',
      },
    },
  });
});

test('leaves unknown checkout errors to the shared error handler', () => {
  assert.equal(checkoutError(new Error('unexpected_database_error')), null);
});
