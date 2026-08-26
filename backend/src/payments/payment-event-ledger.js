import { query } from '../db.js';

export async function recordPaymentEvent({
  provider,
  eventId,
  eventType,
  providerPaymentId,
  payloadHash,
  orderId = null,
}) {
  if (!provider || !eventId || !eventType || !providerPaymentId || !payloadHash) {
    throw new Error('invalid_payment_event');
  }

  const result = await query(
    `INSERT INTO payment_events
      (provider, event_id, event_type, provider_payment_id, payload_hash, order_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id, provider, event_id, event_type, provider_payment_id, payload_hash, status, order_id`,
    [provider, eventId, eventType, providerPaymentId, payloadHash, orderId]
  );

  if (result.rows.length > 0) {
    return { duplicate: false, event: result.rows[0] };
  }

  const existing = await query(
    `SELECT id, provider, event_id, event_type, provider_payment_id, payload_hash, status, order_id
       FROM payment_events
      WHERE provider = $1 AND event_id = $2
      LIMIT 1`,
    [provider, eventId]
  );

  const event = existing.rows[0];
  if (!event) {
    throw new Error('payment_event_not_found');
  }

  const samePayload =
    event.event_type === eventType &&
    event.provider_payment_id === providerPaymentId &&
    event.payload_hash === payloadHash &&
    (event.order_id ?? null) === (orderId ?? null);

  if (!samePayload) {
    throw new Error('payment_event_payload_mismatch');
  }

  return { duplicate: true, event };
}
