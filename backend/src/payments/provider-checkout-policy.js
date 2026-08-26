export function validateProviderCheckout({ order, checkout }) {
  if (!order?.id) throw new Error('order_required');
  if (order.status !== 'pending') throw new Error('order_not_pending');
  if (!checkout) throw new Error('checkout_missing');
  if (checkout.orderId !== order.id) throw new Error('checkout_order_mismatch');
  if (checkout.idempotencyKey !== `order:${order.id}`) throw new Error('checkout_idempotency_mismatch');
  if (checkout.amount == null || Number(checkout.amount) !== Number(order.amount)) {
    throw new Error('checkout_amount_mismatch');
  }
  if (checkout.currency !== order.currency) throw new Error('checkout_currency_mismatch');
  return true;
}
