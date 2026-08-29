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
  if (error.message === 'payment_provider_required') {
    return { status: 400, body: { error: { code: 'PAYMENT_PROVIDER_REQUIRED', message: 'Payment provider is required' } } };
  }
  if (error.message === 'payment_provider_not_configured_for_owner') {
    return { status: 409, body: { error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'The selected payment provider is not configured for this seller' } } };
  }
  if (error.message.startsWith('payment_provider_adapter_not_ready:')) {
    const providerId = error.message.split(':')[1] ?? 'unknown';
    return { status: 503, body: { error: { code: 'PAYMENT_PROVIDER_ADAPTER_NOT_READY', message: `Payment provider adapter is not ready: ${providerId}` } } };
  }
  return null;
}

export function registerCheckoutRoutes(app) {
  app.post('/api/orders/:orderId/checkout', requireAuth, async (req, res, next) => {
    try {
      const session = await createCheckoutSession({
        orderId: req.params.orderId,
        userId: req.user.id,
        providerId: req.body?.providerId ?? null,
      });

      return res.status(200).json({ session });
    } catch (error) {
      const response = checkoutError(error);
      if (response) return res.status(response.status).json(response.body);
      return next(error);
    }
  });
}
