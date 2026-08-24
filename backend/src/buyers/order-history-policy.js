export function buildBuyerOrderHistory({ user, orders, products }) {
  if (!user) throw new Error('authentication_required');

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  return (orders ?? [])
    .filter((order) => order.buyer_id === user.id)
    .map((order) => {
      const product = productById.get(order.product_id);
      return {
        orderId: order.id,
        productId: order.product_id,
        title: product?.title ?? '商品',
        amount: order.amount,
        currency: order.currency,
        status: order.status,
        createdAt: order.created_at,
        paidAt: order.paid_at ?? null,
        refundedAt: order.refunded_at ?? null,
      };
    });
}

export function canViewOrderDetail({ user, order }) {
  if (!user || !order) return false;
  return order.buyer_id === user.id;
}
