import { query } from '../db.js';

export async function getProductForOrder(productId) {
  if (!productId) throw new Error('product_required');

  const result = await query(
    `SELECT
       p.id,
       p.seller_id,
       p.price_amount,
       p.price_currency,
       p.status
     FROM products p
     JOIN seller_profiles sp ON sp.user_id = p.seller_id
     JOIN users su ON su.id = p.seller_id
     WHERE p.id = $1
       AND p.status = 'published'
       AND su.status = 'active'
     LIMIT 1`,
    [productId]
  );

  return result.rows[0] ?? null;
}
