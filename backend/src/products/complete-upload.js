import { canTransitionProduct } from './seller-product-policy.js';

export function completeUpload({ user, asset, product }) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller' && user.role !== 'admin') throw new Error('forbidden');
  if (!asset || asset.owner_user_id !== user.id) throw new Error('not_found');
  if (!product || (user.role !== 'admin' && product.seller_id !== user.id)) throw new Error('not_found');
  if (asset.status !== 'private' && asset.status !== 'processing') throw new Error('invalid_media_state');
  if (!canTransitionProduct(product.status, 'submitted')) throw new Error('invalid_product_transition');

  return {
    assetStatus: 'ready',
    productStatus: 'submitted',
  };
}
