import { query } from '../db.js';

export async function hasActiveEntitlement(userId, productId) {
  if (!userId || !productId) return false;

  const result = await query(
    `SELECT 1
       FROM entitlements
      WHERE user_id = $1
        AND product_id = $2
        AND status = 'active'
      LIMIT 1`,
    [userId, productId]
  );

  return result.rows.length > 0;
}
