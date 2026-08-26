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

  if (result.rows.length === 0) {
    return { duplicate: true };
  }

  return { duplicate: false, event: result.rows[0] };
}
