import crypto from 'node:crypto';

export function verifyWebhookSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const provided = String(signature).trim().toLowerCase();
  const expectedBuffer = Buffer.from(expected, 'utf8');
  const providedBuffer = Buffer.from(provided, 'utf8');

  if (expectedBuffer.length !== providedBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}
