import { createPendingOrder } from './orders/create-order-policy.js';
import { assertValidOrderRecord } from './orders/order-state-validation.js';

export function registerOrderRoutes(app) {
  app.post('/api/orders', async (req, res, next) => {
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
