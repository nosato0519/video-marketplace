import { getPublicProductDetail } from './product-detail-service.js';

export function registerProductDetailRoutes(app) {
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
}
