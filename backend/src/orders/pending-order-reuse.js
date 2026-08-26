import { query } from '../db.js';

export async function findReusablePendingOrder({ buyerId, productId }) {
  const result = await query(
    `SELECT id, buyer_id, product_id, amount, currency, status, created_at
       FROM orders
      WHERE buyer_id = $1
        AND product_id = $2
        AND status = 'pending'
      ORDER BY created_at DESC
      LIMIT 1`,
    [buyerId, productId]
  );

  return result.rows[0] ?? null;
}
