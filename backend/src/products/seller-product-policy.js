export const PRODUCT_STATES = Object.freeze([
  'draft',
  'processing',
  'submitted',
  'under_review',
  'approved',
  'published',
  'rejected',
  'suspended',
]);

const TRANSITIONS = new Map([
  ['draft', new Set(['processing'])],
  ['processing', new Set(['draft', 'submitted'])],
  ['submitted', new Set(['under_review', 'rejected'])],
  ['under_review', new Set(['approved', 'rejected'])],
  ['approved', new Set(['published'])],
  ['published', new Set(['suspended'])],
  ['suspended', new Set(['published'])],
  ['rejected', new Set(['draft'])],
]);

export function canTransitionProduct(from, to) {
  return Boolean(TRANSITIONS.get(from)?.has(to));
}

export function assertSellerOwnsProduct(product, user) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller' && user.role !== 'admin') throw new Error('forbidden');
  if (user.role !== 'admin' && product.seller_id !== user.id) throw new Error('not_found');
}

export function assertPublishable(product) {
  if (product.status !== 'approved') throw new Error('product_not_approved');
  if (!product.title || !product.price_amount || !product.price_currency) {
    throw new Error('product_incomplete');
  }
  if (!product.media_asset_id) throw new Error('media_not_ready');
}
