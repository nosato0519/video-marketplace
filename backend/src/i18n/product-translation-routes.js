import { query } from '../db.js';
import { requireRole } from '../auth/authorize.js';
import {
  getEditableProductTranslations,
  saveEditableProductTranslation,
  removeEditableProductTranslation,
} from './product-translation-policy.js';

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === req.get('host'); } catch { return false; }
}

function requireSameOrigin(req, res, next) {
  if (!sameOrigin(req)) return res.status(403).json({ error: { code: 'CSRF_ORIGIN_REJECTED' } });
  next();
}

async function loadProduct(productId) {
  const result = await query(
    `SELECT id, seller_id, status FROM products WHERE id = $1 LIMIT 1`,
    [productId]
  );
  return result.rows[0] ?? null;
}

function handleError(error, res, next) {
  const map = {
    forbidden: [403, 'FORBIDDEN'],
    translation_fields_required: [400, 'TRANSLATION_FIELDS_REQUIRED'],
    locale_not_enabled: [409, 'LOCALE_NOT_ENABLED'],
  };
  const mapped = map[error.message];
  if (mapped) return res.status(mapped[0]).json({ error: { code: mapped[1] } });
  next(error);
}

export function registerProductTranslationRoutes(app) {
  const sellerOrAdmin = requireRole('seller', 'admin');

  app.get('/api/products/:productId/translations', sellerOrAdmin, async (req, res, next) => {
    try {
      const product = await loadProduct(req.params.productId);
      if (!product) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
      res.json(await getEditableProductTranslations({ user: req.user, productId: product.id, product }));
    } catch (error) { handleError(error, res, next); }
  });

  app.put('/api/products/:productId/translations/:locale', sellerOrAdmin, requireSameOrigin, async (req, res, next) => {
    try {
      const product = await loadProduct(req.params.productId);
      if (!product) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
      const result = await saveEditableProductTranslation({
        user: req.user,
        product,
        productId: product.id,
        locale: req.params.locale,
        title: req.body?.title,
        description: req.body?.description,
      });
      res.json(result);
    } catch (error) { handleError(error, res, next); }
  });

  app.delete('/api/products/:productId/translations/:locale', sellerOrAdmin, requireSameOrigin, async (req, res, next) => {
    try {
      const product = await loadProduct(req.params.productId);
      if (!product) return res.status(404).json({ error: { code: 'NOT_FOUND' } });
      const result = await removeEditableProductTranslation({
        user: req.user,
        product,
        productId: product.id,
        locale: req.params.locale,
      });
      res.json(result || { deleted: false });
    } catch (error) { handleError(error, res, next); }
  });
}
