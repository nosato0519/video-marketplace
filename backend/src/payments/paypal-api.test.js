import test from 'node:test';
import assert from 'node:assert/strict';
import { formatPayPalAmount, getPayPalApiBaseUrl } from './paypal-api.js';

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
