import { query } from '../db.js';

export async function markPaymentEventProcessed({ provider, eventId }) {
  if (!provider || !eventId) throw new Error('payment_event_required');

  const result = await query(
    `UPDATE payment_events
        SET status = 'processed',
            processed_at = NOW(),
            failed_at = NULL
      WHERE provider = $1
        AND event_id = $2
        AND status = 'received'
      RETURNING id, provider, event_id, order_id, status, received_at, processed_at, failed_at`,
    [provider, eventId]
  );

  if (result.rows.length === 0) throw new Error('payment_event_not_pending');
  return result.rows[0];
}
