import test from 'node:test';
import assert from 'node:assert/strict';

const SUCCESS_URL = 'https://market.example/storefront/checkout-success.html';

function appendSessionId(url) {
  if (!url) throw new Error('stripe_redirect_urls_not_configured');
  if (url.includes('{CHECKOUT_SESSION_ID}')) return url;
  return `${url}${url.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`;
}

test('adds Stripe checkout session id to success URL', () => {
  assert.equal(
    appendSessionId(SUCCESS_URL),
    `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`
  );
});

test('preserves existing query parameters', () => {
  assert.equal(
    appendSessionId(`${SUCCESS_URL}?locale=en`),
    `${SUCCESS_URL}?locale=en&session_id={CHECKOUT_SESSION_ID}`
  );
});

test('does not duplicate checkout session placeholder', () => {
  const url = `${SUCCESS_URL}?session_id={CHECKOUT_SESSION_ID}`;
  assert.equal(appendSessionId(url), url);
});

test('requires a configured success URL', () => {
  assert.throws(() => appendSessionId(''), /stripe_redirect_urls_not_configured/);
});
