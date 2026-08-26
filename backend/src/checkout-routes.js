import { requireAuth } from './auth/require-auth.js';
import { createCheckoutSession } from './orders/checkout-service.js';

function checkoutError(error) {
  if (error.message === 'order_required') {
    return { status: 400, body: { error: { code: 'ORDER_REQUIRED', message: 'Order id is required' } } };
  }
  if (error.message === 'order_not_found') {
    return { status: 404, body: { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } } };
  }
  if (error.message === 'order_not_pending') {
    return { status: 409, body: { error: { code: 'ORDER_NOT_PENDING', message: 'Order is not available for checkout' } } };
  }
  return null;
}

export function registerCheckoutRoutes(app) {
  app.post('/api/orders/:orderId/checkout', requireAuth, async (req, res, next) => {
    try {
      const session = await createCheckoutSession({
        orderId: req.params.orderId,
        userId: req.user.id,
      });

      return res.status(200).json({ session });
    } catch (error) {
      const response = checkoutError(error);
      if (response) return res.status(response.status).json(response.body);
      return next(error);
    }
  });
}
