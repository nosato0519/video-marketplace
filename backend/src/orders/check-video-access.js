import { query } from '../db.js';

export async function hasActiveVideoAccess({ buyerId, productId }) {
  if (!buyerId || !productId) return false;

  const result = await query(
    `SELECT 1
       FROM video_entitlements
      WHERE buyer_id = $1
        AND product_id = $2
        AND status = 'active'
        AND revoked_at IS NULL
      LIMIT 1`,
    [buyerId, productId]
  );

  return result.rows.length > 0;
}
