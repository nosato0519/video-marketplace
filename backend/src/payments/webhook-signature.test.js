import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from './webhook-signature.js';

test('accepts a valid signature', () => {
  const body = Buffer.from('{"eventId":"evt_123"}');
  const secret = 'test-secret';
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  assert.equal(verifyWebhookSignature({ rawBody: body, signature, secret }), true);
});

test('rejects an invalid signature', () => {
  const body = Buffer.from('{"eventId":"evt_123"}');
  assert.equal(
    verifyWebhookSignature({ rawBody: body, signature: 'invalid', secret: 'test-secret' }),
    false
  );
});

test('rejects missing signature or secret', () => {
  const body = Buffer.from('{}');
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: '', secret: 'secret' }), false);
  assert.equal(verifyWebhookSignature({ rawBody: body, signature: 'abc', secret: '' }), false);
});
