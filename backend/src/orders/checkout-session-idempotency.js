import { query } from '../db.js';

export async function findExistingCheckout({ orderId, userId }) {
  const result = await query(
    `SELECT id, order_id, provider, provider_session_id, status, created_at
       FROM payment_sessions
      WHERE order_id = $1
        AND user_id = $2
      ORDER BY created_at DESC
      LIMIT 1`,
    [orderId, userId]
  );

  return result.rows[0] ?? null;
}

export function shouldReuseCheckout(session) {
  return Boolean(session && ['created', 'pending'].includes(session.status));
}
