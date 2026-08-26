import { createPendingOrder } from './orders/create-order-policy.js';
import { assertValidOrderRecord } from './orders/order-state-validation.js';
import { getProductForOrder } from './orders/product-for-order.js';
import { hasActiveEntitlement } from './orders/active-entitlement.js';
import { getOrderHistory } from './orders/order-history.js';
import { requireAuth } from './auth/require-auth.js';

export function registerOrderRoutes(app) {
  app.post('/api/orders', requireAuth, async (req, res, next) => {
    try {
      const product = await getProductForOrder(req.body?.productId);
      if (!product) return res.status(404).json({ error: { code: 'PRODUCT_NOT_FOUND', message: 'Product is not available for purchase' } });
      const existingActiveEntitlement = await hasActiveEntitlement(req.user.id, product.id);
      const order = await createPendingOrder({ user: req.user, product, existingActiveEntitlement });
      assertValidOrderRecord(order);
      return res.status(201).json({ order });
    } catch (error) { return next(error); }
  });

  app.get('/api/orders', requireAuth, async (req, res, next) => {
    try { return res.json({ items: await getOrderHistory(req.user.id) }); }
    catch (error) { return next(error); }
  });
}
