export function assertAuthenticated(user) {
  if (!user) throw new Error('authentication_required');
}

export function buildFavoriteRecord({ user, product }) {
  assertAuthenticated(user);
  if (!product || product.status !== 'published') throw new Error('not_found');
  return { userId: user.id, productId: product.id };
}

export function filterVisibleFavorites({ user, favorites, products }) {
  assertAuthenticated(user);
  const productById = new Map((products ?? []).map((p) => [p.id, p]));
  return (favorites ?? [])
    .filter((favorite) => favorite.user_id === user.id)
    .map((favorite) => productById.get(favorite.product_id))
    .filter((product) => product?.status === 'published')
    .map((product) => ({ id: product.id, title: product.title, priceAmount: product.price_amount, priceCurrency: product.price_currency }));
}
