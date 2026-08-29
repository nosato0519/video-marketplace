import { completePayment } from './complete-payment.js';
import { query } from '../db.js';

const SUPPORTED_EVENTS = new Set([
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'payment_intent.succeeded',
]);

export async function handlePaymentWebhook({ event } = {}) {
  if (!event?.id) throw new Error('payment_webhook_event_required');
  if (!SUPPORTED_EVENTS.has(event.type)) return { handled: false, eventId: event.id };

  const session = event.data?.object ?? {};
  const metadata = session.metadata ?? {};
  const paymentId = metadata.paymentId;
  const orderId = metadata.orderId;

  if (!paymentId || !orderId) throw new Error('payment_webhook_metadata_missing');

  const payment = await query(
    `SELECT id, order_id, user_id, provider, provider_payment_id, amount, currency, status
       FROM payments
      WHERE id = $1 AND order_id = $2`,
    [paymentId, orderId]
  );
  if (payment.rowCount === 0) throw new Error('payment_record_not_found');

  const current = payment.rows[0];
  const providerPaymentId = session.payment_intent ?? session.id ?? current.provider_payment_id;
  const payloadHash = event.payloadHash ?? event.payload_hash ?? null;
  const paymentDetails = {
    amount: session.amount_total ?? session.amount_received ?? current.amount,
    currency: session.currency ?? current.currency,
    provider_payment_id: providerPaymentId,
  };

  const eventRecord = await query(
    `INSERT INTO payment_events (provider, event_id, payload_hash, status)
     VALUES ($1, $2, $3, 'received')
     ON CONFLICT (provider, event_id)
     DO UPDATE SET payload_hash = COALESCE(payment_events.payload_hash, EXCLUDED.payload_hash)
     RETURNING id`,
    [current.provider, event.id, payloadHash]
  );

  return completePayment({
    eventId: event.id,
    provider: current.provider,
    providerPaymentId,
    orderId,
    payloadHash,
    payment: paymentDetails,
  });
}
