export function buildCheckoutIdempotencyKey({ orderId } = {}) {
  if (typeof orderId !== 'string' && typeof orderId !== 'number') {
    throw new Error('order_required');
  }
  const normalizedOrderId = String(orderId).trim();
  if (!normalizedOrderId) throw new Error('order_required');
  return `order:${normalizedOrderId}`;
}

export function shouldReuseCheckout(session) {
  return Boolean(session && ['created', 'pending'].includes(session.status));
}
