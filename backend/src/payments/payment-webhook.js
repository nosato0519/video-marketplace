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

  if (!paymentId || !orderId) {
    throw new Error('payment_webhook_metadata_missing');
  }

  const result = await query(
    `UPDATE payments
        SET status = 'paid',
            provider_payment_id = COALESCE($1, provider_payment_id)
      WHERE id = $2
        AND order_id = $3
        AND status <> 'paid'
      RETURNING id, order_id, status`,
    [session.payment_intent ?? session.id ?? null, paymentId, orderId]
  );

  if (result.rowCount === 0) {
    return { handled: true, alreadyProcessed: true, eventId: event.id };
  }

  await query(
    `UPDATE orders
        SET status = 'paid'
      WHERE id = $1
        AND status = 'pending'`,
    [orderId]
  );

  return { handled: true, alreadyProcessed: false, eventId: event.id, paymentId, orderId };
}
