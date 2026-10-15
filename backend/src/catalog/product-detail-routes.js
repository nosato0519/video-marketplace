import { query } from '../db.js';
import { getPublicProductDetail } from './product-detail-service.js';

export function registerProductDetailRoutes(app, { storage } = {}) {
  app.get('/api/catalog/products/:productId', async (req, res, next) => {
    try {
      const product = await getPublicProductDetail({
        productId: req.params.productId,
        locale: typeof req.query.locale === 'string' ? req.query.locale : 'en'
      });
      if (!product) return res.status(404).json({ error: 'not_found' });
      return res.json({ data: product });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/catalog/products/:productId/images/:assetId', async (req, res, next) => {
    if (!storage || typeof storage.getStream !== 'function') {
      return res.status(503).json({ error: 'media_storage_unavailable' });
    }

    try {
      const result = await query(
        `SELECT ma.storage_key, ma.mime_type, ma.byte_size
           FROM products p
           JOIN product_images pi ON pi.product_id = p.id
           JOIN media_assets ma ON ma.id = pi.media_asset_id
          WHERE p.id = $1 AND pi.media_asset_id = $2
            AND p.status = 'published' AND ma.status = 'ready'
            AND ma.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
          LIMIT 1`,
        [req.params.productId, req.params.assetId]
      );
      const asset = result.rows[0];
      if (!asset) return res.status(404).json({ error: 'not_found' });

      const object = await storage.getStream({ storageKey: asset.storage_key });
      if (!object?.stream) return res.status(404).json({ error: 'not_found' });
      res.setHeader('Content-Type', asset.mime_type);
      res.setHeader('Content-Length', String(Number(asset.byte_size)));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      return object.stream.pipe(res);
    } catch (error) {
      return next(error);
    }
  });
}
