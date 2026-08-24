import crypto from 'node:crypto';

export function verifyHmacSignature({ rawBody, signature, secret }) {
  if (!rawBody || !signature || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const provided = signature.replace(/^sha256=/, '');
  if (provided.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
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
