import { listCatalog } from './catalog.js';
import { registerPurchaseIntentRoutes } from './catalog/purchase-intent-routes.js';

export function registerCatalogRoutes(app) {
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

  registerPurchaseIntentRoutes(app);
}
