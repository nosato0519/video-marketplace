export function buildPaymentSettlement({ event, order, product, existingEvent }) {
  if (!event || !order || !product) throw new Error('settlement_context_missing');
  if (existingEvent?.status === 'processed') return { action: 'already_processed' };
  if (order.status === 'paid') return { action: 'already_settled', orderId: order.id };
  if (order.status !== 'pending') throw new Error('order_not_settleable');
  if (event.providerPaymentId !== order.provider_payment_id) throw new Error('payment_reference_mismatch');
  if (Number(event.amount) !== Number(order.amount)) throw new Error('payment_amount_mismatch');
  if (event.currency !== order.currency) throw new Error('payment_currency_mismatch');

  return {
    action: 'settle',
    orderUpdate: { status: 'paid', paid_at: new Date().toISOString() },
    entitlement: {
      userId: order.buyer_id,
      productId: product.id,
      orderId: order.id,
      status: 'active',
    },
    eventUpdate: { status: 'processed', processed_at: new Date().toISOString() },
  };
}
