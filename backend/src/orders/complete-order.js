import { query } from '../db.js';
import { ORDER_STATES } from './order-state.js';
import { assertValidOrderTransition } from './order-transition-contract.js';
import { assertValidOrderRecord } from './order-state-validation.js';
import { grantPurchasedVideoAccess } from './grant-entitlement.js';

export async function completePaidOrder({ orderId, paymentReference }) {
  if (!orderId || !paymentReference) throw new Error('payment_confirmation_required');

  assertValidOrderTransition(ORDER_STATES.PENDING, ORDER_STATES.PAID);

  const result = await query(
    `UPDATE orders
        SET status = $2,
            payment_reference = $3,
            paid_at = NOW(),
            updated_at = NOW()
      WHERE id = $1
        AND status = $4
      RETURNING id, buyer_id, product_id, amount, currency, status, payment_reference,
                refund_reference, paid_at, refunded_at, created_at, updated_at`,
    [orderId, ORDER_STATES.PAID, paymentReference, ORDER_STATES.PENDING]
  );

  if (result.rows.length === 0) throw new Error('order_not_payable');

  const order = result.rows[0];
  assertValidOrderRecord(order);

  const entitlement = await grantPurchasedVideoAccess({ orderId: order.id });
  return { order, entitlement };
}
