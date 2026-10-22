export function buildCheckoutIdempotencyKey({ orderId } = {}) {
  if (
    (typeof orderId !== 'string' && typeof orderId !== 'number') ||
    (typeof orderId === 'number' && !Number.isSafeInteger(orderId))
  ) {
    throw new Error('order_required');
  }
  const normalizedOrderId = String(orderId).trim();
  if (!normalizedOrderId) throw new Error('order_required');
  const idempotencyKey = `order:${normalizedOrderId}`;
  if (idempotencyKey.length > 255) throw new Error('payment_idempotency_key_invalid');
  return idempotencyKey;
}

export function shouldReuseCheckout(session) {
  return Boolean(session && ['created', 'pending'].includes(session.status));
}
