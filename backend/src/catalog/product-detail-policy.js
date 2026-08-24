export function buildProductDetail({ product, seller, viewer }) {
  if (!product || product.status !== 'published') throw new Error('not_found');

  const isOwner = Boolean(viewer && seller && viewer.id === seller.id);
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    priceAmount: product.price_amount,
    priceCurrency: product.price_currency,
    category: product.category,
    publishedAt: product.published_at,
    seller: seller ? { id: seller.id, displayName: seller.display_name } : null,
    viewer: { isOwner },
    purchaseAction: !isOwner,
  };
}

export function validatePurchaseIntent({ user, product }) {
  if (!user) throw new Error('authentication_required');
  if (!product || product.status !== 'published') throw new Error('not_found');
  if (product.seller_id === user.id) throw new Error('seller_cannot_purchase_own_product');
  if (!Number.isFinite(Number(product.price_amount)) || Number(product.price_amount) < 0) {
    throw new Error('invalid_product_price');
  }
  return { productId: product.id };
}
