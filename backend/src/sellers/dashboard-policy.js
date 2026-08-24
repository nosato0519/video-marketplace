export function buildSellerDashboard({ user, sales, products }) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller' && user.role !== 'admin') throw new Error('forbidden');

  const ownProducts = (products ?? []).filter((p) => user.role === 'admin' || p.seller_id === user.id);
  const ownSales = (sales ?? []).filter((s) => user.role === 'admin' || s.seller_id === user.id);

  return {
    productCount: ownProducts.length,
    publishedProductCount: ownProducts.filter((p) => p.status === 'published').length,
    pendingReviewCount: ownProducts.filter((p) => ['submitted', 'under_review'].includes(p.status)).length,
    salesCount: ownSales.filter((s) => s.status === 'paid').length,
    refundedCount: ownSales.filter((s) => s.status === 'refunded').length,
  };
}
