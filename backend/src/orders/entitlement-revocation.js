import { query } from '../db.js';

export async function revokeVideoAccessForRefund({ orderId }) {
  if (!orderId) throw new Error('order_required');

  const result = await query(
    `UPDATE entitlements
        SET status = 'revoked',
            revoked_at = NOW()
      WHERE order_id = $1
        AND status = 'active'
      RETURNING id, user_id, product_id, order_id, status, created_at, revoked_at`,
    [orderId]
  );

  return result.rows;
}
