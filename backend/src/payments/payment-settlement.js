import { query } from '../db.js';
import { grantPurchasedVideoAccess } from '../orders/grant-entitlement.js';

export async function settleSuccessfulPayment({ paymentId, orderId, providerPaymentId } = {}) {
  if (!paymentId || !orderId) throw new Error('payment_settlement_identifiers_required');

  const payment = await query(
    `UPDATE payments
        SET status = 'succeeded',
            provider_payment_id = COALESCE($1, provider_payment_id)
      WHERE id = $2
        AND order_id = $3
        AND status <> 'succeeded'
      RETURNING id, order_id, user_id, status`,
    [providerPaymentId ?? null, paymentId, orderId]
  );

  if (payment.rowCount === 0) {
    const existing = await query(
      `SELECT id, order_id, user_id, status
         FROM payments
        WHERE id = $1 AND order_id = $2`,
      [paymentId, orderId]
    );
    if (existing.rowCount === 0) throw new Error('payment_not_found');
    if (existing.rows[0].status !== 'succeeded') throw new Error('payment_not_settled');
  }

  await query(
    `UPDATE orders
        SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
      WHERE id = $1
        AND status <> 'paid'`,
    [orderId]
  );

  const entitlement = await grantPurchasedVideoAccess({ orderId });
  return { paymentId, orderId, entitlementId: entitlement.id, status: 'settled' };
}
