import { query } from '../db.js';

export async function getOrderHistory(userId) {
  if (!userId) return [];

  const result = await query(`
    SELECT o.id,
           o.status,
           o.amount,
           o.currency,
           o.created_at,
           o.paid_at,
           o.refunded_at,
           o.product_id,
           p.title
      FROM orders o
      JOIN products p ON p.id = o.product_id
     WHERE o.buyer_id = $1
     ORDER BY o.created_at DESC`, [userId]);

  return result.rows.map((order) => ({
    orderId: order.id,
    productId: order.product_id,
    title: order.title,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at ?? null,
    refundedAt: order.refunded_at ?? null,
  }));
}
