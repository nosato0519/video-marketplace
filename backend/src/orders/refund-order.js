import { query } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from './order-state.js';
import { revokeVideoAccessForRefund } from './entitlement-revocation.js';

export async function refundPaidOrder({ orderId, refundReference }) {
  if (!orderId || !refundReference) throw new Error('refund_confirmation_required');

  const result = await query(
    `UPDATE orders
        SET status = $2,
            refund_reference = $3,
            refunded_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
        AND status = $4
      RETURNING id, buyer_id, product_id, status, refund_reference, refunded_at`,
    [orderId, ORDER_STATES.REFUNDED, refundReference, ORDER_STATES.PAID]
  );

  if (result.rows.length === 0) throw new Error('order_not_refundable');

  const order = result.rows[0];
  if (!canTransitionOrder(ORDER_STATES.PAID, order.status)) {
    throw new Error('invalid_order_transition');
  }

  await revokeVideoAccessForRefund({ orderId });
  return order;
}
