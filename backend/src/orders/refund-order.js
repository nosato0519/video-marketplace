import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { assertValidOrderTransition } from './order-transition-contract.js';
import { revokeVideoAccessForRefund } from './entitlement-revocation.js';

export async function refundPaidOrder({ orderId, refundReference }) {
  if (!orderId || !refundReference) throw new Error('refund_confirmation_required');

  assertValidOrderTransition(ORDER_STATES.PAID, ORDER_STATES.REFUNDED);

  const result = await query(
    `UPDATE orders
        SET status = $2,
            refund_reference = $3,
            refunded_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
        AND status = $4
      RETURNING id, buyer_id, product_id, amount, currency, status, payment_reference,
                refund_reference, paid_at, refunded_at, created_at, updated_at`,
    [orderId, ORDER_STATES.REFUNDED, refundReference, ORDER_STATES.PAID]
  );

  if (result.rows.length === 0) throw new Error('order_not_refundable');

  const order = result.rows[0];
  await revokeVideoAccessForRefund({ orderId });
  return order;
}
