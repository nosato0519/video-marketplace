import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';

export async function grantPurchasedVideoAccess({ orderId }) {
  if (!orderId) throw new Error('order_required');

  const result = await query(
    `INSERT INTO video_entitlements (buyer_id, product_id, order_id, status, granted_at)
     SELECT o.buyer_id, o.product_id, o.id, 'active', NOW()
       FROM orders o
      WHERE o.id = $1
        AND o.status = $2
     ON CONFLICT (buyer_id, product_id)
     DO UPDATE SET
       status = 'active',
       order_id = EXCLUDED.order_id,
       granted_at = COALESCE(video_entitlements.granted_at, EXCLUDED.granted_at),
       revoked_at = NULL
     RETURNING id, buyer_id, product_id, order_id, status, granted_at`,
    [orderId, ORDER_STATES.PAID]
  );

  if (result.rows.length === 0) throw new Error('paid_order_required');
  return result.rows[0];
}
