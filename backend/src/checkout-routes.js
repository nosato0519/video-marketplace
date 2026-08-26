import { requireAuth } from './auth/require-auth.js';
import { createCheckoutSession } from './orders/checkout-service.js';

export function registerCheckoutRoutes(app) {
  app.post('/api/orders/:orderId/checkout', requireAuth, async (req, res, next) => {
    try {
      const session = await createCheckoutSession({
        orderId: req.params.orderId,
        userId: req.user.id,
      });

      return res.status(200).json({ session });
    } catch (error) {
      return next(error);
    }
  });
}
