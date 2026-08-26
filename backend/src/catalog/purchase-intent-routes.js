import { requireAuth } from '../auth/require-auth.js';
import { getPublicProductDetail } from './product-detail-service.js';
import { validatePurchaseIntent } from './product-detail-policy.js';

export function registerPurchaseIntentRoutes(app) {
  app.post('/api/catalog/products/:productId/purchase-intent', requireAuth, async (req, res, next) => {
    try {
      const product = await getPublicProductDetail({
        productId: req.params.productId,
        locale: typeof req.body?.locale === 'string' ? req.body.locale : 'en',
      });
      const intent = validatePurchaseIntent({ user: req.user, product });
      return res.status(200).json({ data: intent });
    } catch (error) {
      if (error.message === 'authentication_required') {
        return res.status(401).json({ error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication required' } });
      }
      if (error.message === 'not_found') {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
      }
      if (error.message === 'seller_cannot_purchase_own_product') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'This product cannot be purchased by its seller' } });
      }
      return next(error);
    }
  });
}
