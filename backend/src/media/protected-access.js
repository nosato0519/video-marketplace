import { canAccessPurchasedMedia } from '../payments/entitlement-service.js';

export function authorizeProtectedMedia({ user, entitlement, product, asset }) {
  if (!user) return { allowed: false, status: 401, error: 'authentication_required' };
  if (product?.content_blocked) return { allowed: false, status: 404, error: 'not_found' };
  if (!canAccessPurchasedMedia({ entitlement, product, asset })) {
    return { allowed: false, status: 404, error: 'not_found' };
  }
  if (entitlement.user_id && entitlement.user_id !== user.id) {
    return { allowed: false, status: 404, error: 'not_found' };
  }
  return { allowed: true, status: 200 };
}

export function buildPrivateMediaResponse({ asset, signedUrl }) {
  if (!asset || asset.status !== 'ready' || !signedUrl) {
    throw new Error('media_not_ready');
  }
  return {
    assetId: asset.id,
    expiresInSeconds: 300,
    url: signedUrl,
  };
}
