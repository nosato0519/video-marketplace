import { settleSuccessfulPayment } from './payment-settlement.js';

const SUCCESS_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'payment_intent.succeeded',
]);

function hasIdentifier(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function settlePaymentWebhook({ event } = {}) {
  if (!hasIdentifier(event?.id) || !hasIdentifier(event?.type)) {
    throw new Error('payment_webhook_event_required');
  }
  if (!SUCCESS_EVENTS.has(event.type)) return { handled: false, eventId: event.id };

  const object = event.data?.object ?? {};
  if (event.type.startsWith('checkout.session.') && object.payment_status !== 'paid') {
    return { handled: false, eventId: event.id, reason: 'payment_not_paid' };
  }

  const metadata = object.metadata ?? {};
  const paymentId = metadata.paymentId;
  const orderId = metadata.orderId;
  if (!hasIdentifier(paymentId) || !hasIdentifier(orderId)) {
    throw new Error('payment_webhook_metadata_missing');
  }

  const isCheckoutSession = event.type.startsWith('checkout.session.');
  const providerPaymentId = isCheckoutSession ? object.payment_intent : object.id;
  if (!hasIdentifier(providerPaymentId)) {
    throw new Error('payment_provider_id_required');
  }

  return settleSuccessfulPayment({ paymentId, orderId, providerPaymentId });
}
