import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { assertValidOrderTransition } from './order-transition-contract.js';
import { assertValidOrderRecord } from './order-state-validation.js';

export async function cancelPendingOrder({ orderId }) {
  if (!orderId) throw new Error('order_required');

  assertValidOrderTransition(ORDER_STATES.PENDING, ORDER_STATES.CANCELLED);

  const result = await query(
    `UPDATE orders
        SET status = $2,
            updated_at = NOW()
      WHERE id = $1
        AND status = $3
      RETURNING id, buyer_id, product_id, amount, currency, status, payment_reference,
                refund_reference, paid_at, refunded_at, created_at, updated_at`,
    [orderId, ORDER_STATES.CANCELLED, ORDER_STATES.PENDING]
  );

  if (result.rows.length === 0) throw new Error('order_not_cancellable');

  const order = result.rows[0];
  assertValidOrderRecord(order);
  return order;
}
