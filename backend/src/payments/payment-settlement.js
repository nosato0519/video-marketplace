import { withTransaction } from '../db.js';

export async function settleSuccessfulPayment({ paymentId, orderId, providerPaymentId } = {}) {
  if (!paymentId || !orderId) throw new Error('payment_settlement_identifiers_required');

  return withTransaction(async (client) => {
    const order = await client.query(
      'SELECT id, status FROM orders WHERE id = $1 FOR UPDATE',
      [orderId]
    );
    if (order.rowCount === 0) throw new Error('order_not_found');
    if (!['pending', 'paid'].includes(order.rows[0].status)) {
      throw new Error('payment_order_not_settleable');
    }

    const payment = await client.query(
      `SELECT id, order_id, user_id, status
         FROM payments
        WHERE id = $1 AND order_id = $2
        FOR UPDATE`,
      [paymentId, orderId]
    );
    if (payment.rowCount === 0) throw new Error('payment_not_found');
    const currentPayment = payment.rows[0];
    if (['refunded', 'failed', 'cancelled'].includes(currentPayment.status)) {
      throw new Error('payment_not_settleable');
    }

    if (currentPayment.status !== 'succeeded') {
      await client.query(
        `UPDATE payments
            SET status = 'succeeded',
                provider_payment_id = COALESCE($1, provider_payment_id)
          WHERE id = $2 AND order_id = $3`,
        [providerPaymentId ?? null, paymentId, orderId]
      );
    } else if (providerPaymentId) {
      await client.query(
        `UPDATE payments
            SET provider_payment_id = COALESCE(provider_payment_id, $1)
          WHERE id = $2 AND order_id = $3`,
        [providerPaymentId, paymentId, orderId]
      );
    }

    if (order.rows[0].status !== 'paid') {
      const updatedOrder = await client.query(
        `UPDATE orders
            SET status = 'paid', paid_at = COALESCE(paid_at, NOW())
          WHERE id = $1 AND status = 'pending'
          RETURNING id`,
        [orderId]
      );
      if (updatedOrder.rowCount === 0) throw new Error('payment_order_not_settleable');
    }

    const entitlement = await client.query(
      `INSERT INTO entitlements (user_id, product_id, order_id, status, created_at)
       SELECT o.buyer_id, o.product_id, o.id, 'active', NOW()
         FROM orders o
        WHERE o.id = $1 AND o.status = 'paid'
       ON CONFLICT (user_id, product_id) WHERE status = 'active'
       DO UPDATE SET order_id = entitlements.order_id
       RETURNING id`,
      [orderId]
    );
    if (entitlement.rowCount === 0) throw new Error('paid_order_required');

    await client.query(
      `INSERT INTO seller_earnings
        (seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status)
       SELECT p.seller_id, o.id, o.product_id, o.amount, 0, o.amount, o.currency, 'available'
         FROM orders o
         JOIN products p ON p.id = o.product_id
        WHERE o.id = $1
          AND o.status = 'paid'
       ON CONFLICT (order_id, product_id) DO NOTHING`,
      [orderId]
    );

    return { paymentId, orderId, entitlementId: entitlement.rows[0].id, status: 'settled' };
  });
}
