import crypto from 'node:crypto';

export function verifyHmacSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  if (!/^[a-f\d]+$/i.test(provided) || provided.length !== expected.length) return false;
  const providedBytes = Buffer.from(provided, 'hex');
  const expectedBytes = Buffer.from(expected, 'hex');
  if (providedBytes.length !== expectedBytes.length) return false;
  return crypto.timingSafeEqual(providedBytes, expectedBytes);
}

export function validatePaymentEvent(event) {
  if (!event || typeof event !== 'object') throw new Error('invalid_payment_event');
  if (!event.eventId || !event.type || !event.providerPaymentId) {
    throw new Error('incomplete_payment_event');
  }
  return {
    eventId: String(event.eventId),
    type: String(event.type),
    providerPaymentId: String(event.providerPaymentId),
  };
}

export function isSuccessfulPaymentEvent(type) {
  return new Set(['payment.succeeded', 'checkout.completed']).has(type);
}
