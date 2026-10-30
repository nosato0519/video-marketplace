import { listCatalog, listHomepageSection } from './catalog.js';
import { registerPurchaseIntentRoutes } from './catalog/purchase-intent-routes.js';

export function registerCatalogRoutes(app) {
  app.get('/api/catalog/homepage-sections', async (req, res, next) => {
    try {
      const type = typeof req.query.type === 'string' ? req.query.type : '';
      if (!['popular', 'categories'].includes(type)) {
        return res.status(400).json({ error: 'unsupported_homepage_section' });
      }
      const data = await listHomepageSection({
        type,
        locale: typeof req.query.locale === 'string' ? req.query.locale : 'ja',
        limit: req.query.limit
      });
      res.set('Cache-Control', 'no-store');
      res.json({ data });
    } catch (error) {
      next(error);
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

  registerPurchaseIntentRoutes(app);
}
