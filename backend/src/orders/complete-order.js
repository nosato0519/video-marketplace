import { query } from '../db.js';
import { ORDER_STATES, canTransitionOrder } from './order-state.js';

export async function completePaidOrder({ orderId, paymentReference }) {
  if (!orderId || !paymentReference) throw new Error('payment_confirmation_required');

  const result = await query(
    `UPDATE orders
        SET status = $2,
            payment_reference = $3,
            paid_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
        AND status = $4
      RETURNING id, buyer_id, product_id, status, payment_reference, paid_at`,
    [orderId, ORDER_STATES.PAID, paymentReference, ORDER_STATES.PENDING]
  );

  if (result.rows.length === 0) throw new Error('order_not_payable');

  const order = result.rows[0];
  if (!canTransitionOrder(ORDER_STATES.PENDING, order.status)) {
    throw new Error('invalid_order_transition');
  }

  return order;
}
