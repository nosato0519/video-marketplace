import { getCatalogProduct, listCatalog } from './catalog.js';

export function registerCatalogRoutes(app) {
  app.get('/api/catalog/products/:id', async (req, res, next) => {
    try {
      const product = await getCatalogProduct({
        id: req.params.id,
        locale: typeof req.query.locale === 'string' ? req.query.locale : 'en'
      });
      if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' } });
      return res.json({ data: product });
    } catch (error) {
      return next(error);
    }
  });

  app.get('/api/catalog/products', async (req, res, next) => {
    try {
      const result = await listCatalog({
        locale: typeof req.query.locale === 'string' ? req.query.locale : 'en',
        category: typeof req.query.category === 'string' ? req.query.category : '',
        search: typeof req.query.search === 'string' ? req.query.search : '',
        page: req.query.page,
        limit: req.query.limit
      });
      res.json(result);
    } catch (error) {
      next(error);
    }
  });
}
