import { canTransitionProduct } from '../products/seller-product-policy.js';

export function assertModerator(user) {
  if (!user) throw new Error('authentication_required');
  if (!['moderator', 'admin'].includes(user.role)) throw new Error('forbidden');
}

export function reviewProduct({ user, product, decision, reason = '' }) {
  assertModerator(user);
  if (!product) throw new Error('not_found');

  if (decision === 'approve') {
    if (!canTransitionProduct(product.status, 'approved')) throw new Error('invalid_review_state');
    return { status: 'approved', reviewReason: '' };
  }

  if (decision === 'reject') {
    if (!canTransitionProduct(product.status, 'rejected')) throw new Error('invalid_review_state');
    if (!reason.trim()) throw new Error('rejection_reason_required');
    return { status: 'rejected', reviewReason: reason.trim().slice(0, 2000) };
  }

  throw new Error('invalid_review_decision');
}

export function publishApprovedProduct({ user, product }) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller' && user.role !== 'admin') throw new Error('forbidden');
  if (!product || (user.role !== 'admin' && product.seller_id !== user.id)) throw new Error('not_found');
  if (!canTransitionProduct(product.status, 'published')) throw new Error('product_not_approved');
  return { status: 'published' };
}
