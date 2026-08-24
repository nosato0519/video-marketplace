export function buildSettlementTransaction({ event, order, entitlement }) {
  if (!event || !order) throw new Error('settlement_context_missing');
  if (event.status === 'processed') return { action: 'already_processed' };
  if (order.status === 'paid') return { action: 'already_settled', orderId: order.id };
  if (order.status !== 'pending') throw new Error('order_not_settleable');

  return {
    action: 'commit',
    eventId: event.id,
    orderId: order.id,
    entitlement: entitlement ?? {
      userId: order.buyer_id,
      productId: order.product_id,
      orderId: order.id,
      status: 'active',
    },
  };
}

export function assertSettlementWriteOrder({ order, event }) {
  if (!order || !event) throw new Error('settlement_context_missing');
  if (event.order_id && event.order_id !== order.id) throw new Error('order_reference_mismatch');
  if (event.status === 'processed' || order.status === 'paid') return false;
  return true;
}
