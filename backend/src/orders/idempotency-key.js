import { query } from '../db.js';

export async function reservePaymentEvent({ provider, eventId, orderId }) {
  if (!provider || !eventId || !orderId) throw new Error('payment_event_required');

  const result = await query(
    `INSERT INTO payment_events (provider, event_id, order_id, status, received_at)
     VALUES ($1, $2, $3, 'received', NOW())
     ON CONFLICT (provider, event_id)
     DO UPDATE SET
       status = CASE
         WHEN payment_events.status = 'failed' THEN 'received'
         ELSE payment_events.status
       END
     RETURNING id, provider, event_id, order_id, status, received_at`,
    [provider, eventId, orderId]
  );

  const event = result.rows[0] ?? null;
  if (!event || event.status !== 'received') return null;
  return event;
}
