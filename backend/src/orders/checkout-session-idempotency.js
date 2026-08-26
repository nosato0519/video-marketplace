export function buildCheckoutIdempotencyKey({ orderId }) {
  if (!orderId) throw new Error('order_required');
  return `order:${orderId}`;
}

export function shouldReuseCheckout(session) {
  return Boolean(session && ['created', 'pending'].includes(session.status));
}
