export function buildBuyerLibrary({ user, entitlements, products }) {
  if (!user) throw new Error('authentication_required');

  const ownEntitlements = (entitlements ?? []).filter(
    (item) => item.user_id === user.id && item.status === 'active',
  );

  const productById = new Map((products ?? []).map((product) => [product.id, product]));

  return ownEntitlements
    .map((entitlement) => {
      const product = productById.get(entitlement.product_id);
      if (!product || product.status !== 'published') return null;
      return {
        productId: product.id,
        title: product.title,
        purchasedAt: entitlement.created_at,
      };
    })
    .filter(Boolean);
}

export function canOpenLibraryItem({ user, entitlement }) {
  if (!user || !entitlement) return false;
  return entitlement.user_id === user.id && entitlement.status === 'active';
}
