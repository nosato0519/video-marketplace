import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole, requireOwner } from '../auth/authorize.js';
import { validateProductForPublishing } from '../catalog/publish-guard.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

router.get('/products', async (req, res, next) => {
  try {
    const result = await query(`SELECT id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at FROM products WHERE seller_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    return res.json({ products: result.rows });
  } catch (error) { return next(error); }
});

router.get('/products/:productId', async (req, res, next) => {
  try {
    const result = await query(`SELECT id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at FROM products WHERE id = $1`, [req.params.productId]);
    if (!result.rows.length) return res.status(404).json({ error: 'product_not_found' });
    requireOwner(result.rows[0], 'seller_id')(req, res, () => {});
    if (res.headersSent) return;
    return res.json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/products', async (req, res, next) => {
  try {
    const { title = '', description = '', priceAmount = 0, priceCurrency = 'JPY', mediaAssetId = null } = req.body || {};
    const result = await query(`INSERT INTO products (seller_id, media_asset_id, status, price_amount, price_currency, title, description) VALUES ($1, $2, 'draft', $3, $4, $5, $6) RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.user.id, mediaAssetId, priceAmount, String(priceCurrency).toUpperCase(), String(title), String(description)]);
    return res.status(201).json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

router.patch('/products/:productId', async (req, res, next) => {
  try {
    const current = await query('SELECT * FROM products WHERE id = $1', [req.params.productId]);
    if (!current.rows.length) return res.status(404).json({ error: 'product_not_found' });
    const product = current.rows[0];
    requireOwner(product, 'seller_id')(req, res, () => {});
    if (res.headersSent) return;
    const { title, description, priceAmount, priceCurrency, mediaAssetId } = req.body || {};
    if (product.status === 'published') return res.status(409).json({ error: 'published_product_locked' });
    const result = await query(`UPDATE products SET title = COALESCE($2, title), description = COALESCE($3, description), price_amount = COALESCE($4, price_amount), price_currency = COALESCE($5, price_currency), media_asset_id = COALESCE($6, media_asset_id), updated_at = NOW() WHERE id = $1 AND seller_id = $7 RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.params.productId, title == null ? null : String(title), description == null ? null : String(description), priceAmount == null ? null : priceAmount, priceCurrency == null ? null : String(priceCurrency).toUpperCase(), mediaAssetId == null ? null : mediaAssetId, req.user.id]);
    return res.json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/products/:productId/publish', async (req, res, next) => {
  try {
    const result = await query(`SELECT p.*, m.id AS media_id, m.owner_user_id AS media_owner_user_id, m.status AS media_status FROM products p LEFT JOIN media_assets m ON m.id = p.media_asset_id WHERE p.id = $1 AND p.seller_id = $2`, [req.params.productId, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'product_not_found' });
    const row = result.rows[0];
    const validation = validateProductForPublishing({
      product: { seller_id: row.seller_id, title: row.title, price_amount: row.price_amount, price_currency: row.price_currency, media_asset_id: row.media_asset_id },
      mediaAsset: row.media_id ? { id: row.media_id, owner_user_id: row.media_owner_user_id, status: row.media_status } : null,
    });
    if (!validation.allowed) return res.status(422).json({ error: 'product_not_publishable', reasons: validation.errors });
    const published = await query(`UPDATE products SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1 AND seller_id = $2 AND status IN ('draft','processing','submitted','under_review','approved') RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.params.productId, req.user.id]);
    if (!published.rows.length) return res.status(409).json({ error: 'product_status_not_publishable' });
    return res.json({ product: published.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/products/:productId/unpublish', async (req, res, next) => {
  try {
    const result = await query(`UPDATE products SET status = 'draft', published_at = NULL, updated_at = NOW() WHERE id = $1 AND seller_id = $2 AND status = 'published' RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.params.productId, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'published_product_not_found' });
    return res.json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
