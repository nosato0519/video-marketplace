import { query } from '../db.js';

export async function findReusablePendingOrder({ buyerId, productId, amount, currency }) {
  const result = await query(
    `SELECT id, buyer_id, product_id, amount, currency, status, created_at
       FROM orders
      WHERE buyer_id = $1
        AND product_id = $2
        AND status = 'pending'
        AND amount = $3
        AND currency = $4
      ORDER BY created_at DESC
      LIMIT 1`,
    [buyerId, productId, amount, currency]
  );

  return result.rows[0] ?? null;
}
