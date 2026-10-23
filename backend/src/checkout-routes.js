import { requireAuth } from './auth/require-auth.js';
import { createCheckoutSession } from './orders/checkout-service.js';
import { checkoutRateLimit } from './rate-limit.js';

export function checkoutError(error) {
  if (error.message === 'order_required') {
    return { status: 400, body: { error: { code: 'ORDER_REQUIRED', message: 'Order id is required' } } };
  }
  if (error.message === 'order_not_found') {
    return { status: 404, body: { error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' } } };
  }
  if (error.message === 'order_not_pending') {
    return { status: 409, body: { error: { code: 'ORDER_NOT_PENDING', message: 'Order is not available for checkout' } } };
  }
  if (error.message === 'payment_not_pending') {
    return { status: 409, body: { error: { code: 'PAYMENT_NOT_PENDING', message: 'Payment is not available for checkout' } } };
  }
  if (error.message === 'payment_owner_missing') {
    return { status: 409, body: { error: { code: 'PAYMENT_OWNER_MISSING', message: 'This order is not available for payment' } } };
  }
  if (['checkout_amount_invalid', 'checkout_amount_precision_invalid'].includes(error.message)) {
    return { status: 409, body: { error: { code: 'ORDER_AMOUNT_INVALID', message: 'The order amount is not valid for checkout' } } };
  }
  if (error.message === 'payment_order_amount_mismatch') {
    return { status: 409, body: { error: { code: 'PAYMENT_ORDER_AMOUNT_MISMATCH', message: 'The payment amount does not match the order' } } };
  }
  if (error.message === 'checkout_session_persistence_failed') {
    return { status: 503, body: { error: { code: 'CHECKOUT_SESSION_NOT_SAVED', message: 'Checkout could not be safely initialized. Please retry later.' } } };
  }
  if (error.message === 'payment_provider_required') {
    return { status: 503, body: { error: { code: 'PAYMENT_PROVIDER_REQUIRED', message: 'Payment provider is not configured for this site' } } };
  }
  if (error.message.startsWith('payment_provider_not_enabled:')) {
    return { status: 400, body: { error: { code: 'PAYMENT_PROVIDER_NOT_ENABLED', message: 'That payment method is not enabled for this site' } } };
  }
  if (error.message.startsWith('unsupported_payment_provider:')) {
    return { status: 503, body: { error: { code: 'PAYMENT_PROVIDER_UNSUPPORTED', message: 'The configured payment provider is not supported by this version' } } };
  }
  if (error.message.startsWith('payment_provider_not_configured:')) {
    return { status: 503, body: { error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'The payment provider credentials are not configured on the server' } } };
  }
  if (error.message === 'stripe_redirect_urls_not_configured') {
    return { status: 503, body: { error: { code: 'PAYMENT_REDIRECT_URLS_NOT_CONFIGURED', message: 'The payment success and cancel URLs are not configured' } } };
  }
  if (['stripe_redirect_url_invalid', 'stripe_redirect_url_must_be_https', 'stripe_success_url_must_not_include_checkout_parameters'].includes(error.message)) {
    return { status: 503, body: { error: { code: 'PAYMENT_REDIRECT_URLS_INVALID', message: 'The payment success and cancel URLs are invalid server configuration' } } };
  }
  if (error.message.startsWith('payment_provider_adapter_not_ready:')) {
    const providerId = error.message.split(':')[1] ?? 'unknown';
    return { status: 503, body: { error: { code: 'PAYMENT_PROVIDER_ADAPTER_NOT_READY', message: `Payment provider adapter is not ready: ${providerId}` } } };
  }
  return null;
}

export function registerCheckoutRoutes(app) {
  app.post('/api/orders/:orderId/checkout', requireAuth, checkoutRateLimit, async (req, res, next) => {
    try {
      const session = await createCheckoutSession({
        orderId: req.params.orderId,
        userId: req.user.id,
        provider: req.body?.provider,
      });

      return res.status(200).json({ session });
    } catch (error) {
      const response = checkoutError(error);
      if (response) return res.status(response.status).json(response.body);
      return next(error);
    }
  });
}
