import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();

async function replaceItems(userId, table, ids) {
  const productIds = [...new Set(ids)];
  await withTransaction(async (client) => {
    const visible = await client.query(
      `SELECT id FROM products WHERE status = 'published' AND id = ANY($1::uuid[])`,
      [productIds]
    );
    const allowedIds = visible.rows.map((row) => row.id);
    await client.query(`DELETE FROM ${table} WHERE user_id = $1`, [userId]);
    if (allowedIds.length) {
      await client.query(
        `INSERT INTO ${table} (user_id, product_id)
         SELECT $1, item.product_id FROM unnest($2::uuid[]) AS item(product_id)
         ON CONFLICT (user_id, product_id) DO NOTHING`,
        [userId, allowedIds]
      );
    }
    return allowedIds;
  });
}

function parseIds(value) {
  if (!Array.isArray(value) || value.length > 500) return null;
  if (value.some((id) => typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))) return null;
  return value;
}

router.use(requireAuth);

router.get('/favorites', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT f.product_id AS "productId"
         FROM user_favorites f
         JOIN products p ON p.id = f.product_id
        WHERE f.user_id = $1 AND p.status = 'published'
        ORDER BY f.created_at DESC`,
      [req.user.id]
    );
    return res.json({ productIds: result.rows.map((row) => row.productId) });
  } catch (error) { return next(error); }
});

router.put('/favorites', async (req, res, next) => {
  try {
    const ids = parseIds(req.body?.productIds);
    if (!ids) return res.status(400).json({ error: { code: 'INVALID_FAVORITES', message: 'Invalid favorite product list' } });
    await replaceItems(req.user.id, 'user_favorites', ids);
    return res.json({ productIds: ids });
  } catch (error) { return next(error); }
});

router.get('/cart', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT c.product_id AS "productId"
         FROM user_cart_items c
         JOIN products p ON p.id = c.product_id
        WHERE c.user_id = $1 AND p.status = 'published'
        ORDER BY c.created_at DESC`,
      [req.user.id]
    );
    return res.json({ productIds: result.rows.map((row) => row.productId) });
  } catch (error) { return next(error); }
});

router.put('/cart', async (req, res, next) => {
  try {
    const ids = parseIds(req.body?.productIds);
    if (!ids) return res.status(400).json({ error: { code: 'INVALID_CART', message: 'Invalid cart product list' } });
    await replaceItems(req.user.id, 'user_cart_items', ids);
    return res.json({ productIds: ids });
  } catch (error) { return next(error); }
});

export default router;
