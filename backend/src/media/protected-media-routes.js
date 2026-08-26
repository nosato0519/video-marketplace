import { createProtectedMediaResponse } from './protected-media-service.js';

export function registerProtectedMediaRoutes(app, {
  getEntitlement,
  getProduct,
  getAsset,
  secret = process.env.MEDIA_URL_SECRET,
} = {}) {
  if (typeof getEntitlement !== 'function') throw new Error('media_entitlement_reader_missing');
  if (typeof getProduct !== 'function') throw new Error('media_product_reader_missing');
  if (typeof getAsset !== 'function') throw new Error('media_asset_reader_missing');

  app.get('/api/media/assets/:assetId/access', async (req, res, next) => {
    try {
      const asset = await getAsset({ assetId: req.params.assetId });
      if (!asset) return res.status(404).json({ error: { code: 'NOT_FOUND' } });

      const product = await getProduct({ productId: asset.product_id ?? asset.productId });
      const entitlement = req.user
        ? await getEntitlement({ userId: req.user.id, productId: product?.id })
        : null;

      const result = await createProtectedMediaResponse({
        user: req.user,
        entitlement,
        product,
        asset,
        secret,
      });

      if (result.allowed === false) {
        return res.status(result.status).json({ error: { code: result.error } });
      }

      return res.json({ data: result });
    } catch (error) {
      return next(error);
    }
  });
}
