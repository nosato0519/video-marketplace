export function createEntitlementFromVerifiedPayment({ order, product }) {
  if (!order || order.status !== 'paid') throw new Error('order_not_paid');
  if (!product || product.id !== order.product_id) throw new Error('product_mismatch');
  if (!order.buyer_id) throw new Error('buyer_missing');

  return {
    userId: order.buyer_id,
    productId: product.id,
    orderId: order.id,
    status: 'active',
  };
}

export function canAccessPurchasedMedia({ entitlement, product, asset }) {
  if (!entitlement || entitlement.status !== 'active') return false;
  if (!product || product.id !== entitlement.product_id || product.status !== 'published') return false;
  if (product.moderation_status === 'blocked') return false;
  if (!asset || asset.id !== product.media_asset_id || asset.status !== 'ready') return false;
  return true;
}

export function revokeEntitlement(entitlement) {
  if (!entitlement) throw new Error('entitlement_not_found');
  return { ...entitlement, status: 'revoked', revoked_at: new Date().toISOString() };
}
