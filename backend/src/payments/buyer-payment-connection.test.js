import test from 'node:test';
import assert from 'node:assert/strict';
import {
  saveBuyerPaymentConnection,
  getBuyerPaymentConnections,
  removeBuyerPaymentConnection,
} from './buyer-payment-connection.js';

test('keeps payment connections isolated by buyer', () => {
  saveBuyerPaymentConnection({ buyerId: 'buyer-a', providerId: 'stripe', credentialRef: 'ref-a' });
  saveBuyerPaymentConnection({ buyerId: 'buyer-b', providerId: 'stripe', credentialRef: 'ref-b' });

  assert.deepEqual(getBuyerPaymentConnections('buyer-a').map((item) => item.buyerId), ['buyer-a']);
  assert.deepEqual(getBuyerPaymentConnections('buyer-b').map((item) => item.buyerId), ['buyer-b']);
});

test('never exposes the credential reference through buyer settings', () => {
  saveBuyerPaymentConnection({ buyerId: 'buyer-safe', providerId: 'stripe', credentialRef: 'secret-ref' });
  const settings = getBuyerPaymentConnections('buyer-safe');
  assert.equal(Object.prototype.hasOwnProperty.call(settings[0], 'credentialRef'), false);
});

test('rejects buyer connections for payment providers that are not implemented', () => {
  assert.throws(
    () => saveBuyerPaymentConnection({ buyerId: 'buyer-remove', providerId: 'adyen', credentialRef: 'ref-remove' }),
    /payment_provider_adapter_not_ready:adyen/
  );
  assert.deepEqual(getBuyerPaymentConnections('buyer-remove'), []);
});
