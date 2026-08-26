import { createPendingOrder } from './orders/create-order-policy.js';
import { assertValidOrderRecord } from './orders/order-state-validation.js';
import { requireAuth } from './auth/require-auth.js';

export function registerOrderRoutes(app) {
  app.post('/api/orders', requireAuth, async (req, res, next) => {
    try {
      const user = req.user;
      const product = req.product;

      const order = await createPendingOrder({
        user,
        product,
        existingActiveEntitlement: Boolean(req.existingActiveEntitlement),
      });

      assertValidOrderRecord(order);

      res.status(201).json({ order });
    } catch (error) {
      next(error);
    }
  });
}
