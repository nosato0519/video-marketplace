import { settleSuccessfulPayment } from './payment-settlement.js';

const SUCCESS_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'payment_intent.succeeded',
]);

export async function settlePaymentWebhook({ event } = {}) {
  if (!event?.id) throw new Error('payment_webhook_event_required');
  if (!SUCCESS_EVENTS.has(event.type)) return { handled: false, eventId: event.id };

  const object = event.data?.object ?? {};
  const metadata = object.metadata ?? {};
  const paymentId = metadata.paymentId;
  const orderId = metadata.orderId;

  if (!paymentId || !orderId) throw new Error('payment_webhook_metadata_missing');

  return settleSuccessfulPayment({
    paymentId,
    orderId,
    providerPaymentId: object.payment_intent ?? object.id ?? null,
  });
}
