import { query } from '../db.js';

export async function getOrderHistory(userId) {
  const result = await query(`
    SELECT o.id, o.status, o.total_amount, o.currency, o.created_at,
           o.paid_at, o.product_id, p.title
      FROM orders o
      JOIN products p ON p.id = o.product_id
     WHERE o.user_id = $1
     ORDER BY o.created_at DESC`, [userId]);
  return result.rows;
}
