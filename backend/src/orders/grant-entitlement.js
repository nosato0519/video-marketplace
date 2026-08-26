import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';

export async function grantPurchasedVideoAccess({ orderId }) {
  if (!orderId) throw new Error('order_required');

  const result = await query(
    `INSERT INTO entitlements (user_id, product_id, order_id, status, created_at)
     SELECT o.buyer_id, o.product_id, o.id, 'active', NOW()
       FROM orders o
      WHERE o.id = $1
        AND o.status = $2
     ON CONFLICT (user_id, product_id) WHERE status = 'active'
     DO UPDATE SET
       order_id = EXCLUDED.order_id,
       status = 'active',
       revoked_at = NULL
     RETURNING id, user_id, product_id, order_id, status, created_at, revoked_at`,
    [orderId, ORDER_STATES.PAID]
  );

  if (result.rows.length === 0) throw new Error('paid_order_required');
  return result.rows[0];
}
