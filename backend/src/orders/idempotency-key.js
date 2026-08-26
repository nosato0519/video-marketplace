import { query } from '../db.js';

export async function reservePaymentEvent({ provider, eventId, orderId }) {
  if (!provider || !eventId || !orderId) throw new Error('payment_event_required');

  const result = await query(
    `INSERT INTO payment_events (provider, event_id, order_id, status, received_at)
     VALUES ($1, $2, $3, 'received', NOW())
     ON CONFLICT (provider, event_id) DO NOTHING
     RETURNING id, provider, event_id, order_id, status, received_at`,
    [provider, eventId, orderId]
  );

  return result.rows[0] ?? null;
}
