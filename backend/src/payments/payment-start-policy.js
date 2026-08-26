export function buildPaymentRecordInput({ order, provider, providerPaymentId = null }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!provider) throw new Error('payment_provider_required');
  if (!order.buyer_id) throw new Error('buyer_required');
  if (!order.product_id) throw new Error('product_required');

  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) throw new Error('invalid_order_amount');
  if (!/^[A-Z]{3}$/.test(String(order.currency).toUpperCase())) {
    throw new Error('invalid_order_currency');
  }

  return {
    orderId: order.id,
    buyerId: order.buyer_id,
    productId: order.product_id,
    amount,
    currency: String(order.currency).toUpperCase(),
    provider,
    providerPaymentId,
    status: 'pending',
    idempotencyKey: `order:${order.id}`,
  };
}
