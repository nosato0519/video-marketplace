import { hasActiveVideoAccess } from './check-video-access.js';

export async function requireVideoAccess({ buyerId, productId } = {}) {
  if (!buyerId || !productId) {
    throw new Error('video_access_authentication_required');
  }

  const allowed = await hasActiveVideoAccess({ buyerId, productId });
  if (!allowed) {
    const error = new Error('video_access_denied');
    error.code = 'VIDEO_ACCESS_DENIED';
    throw error;
  }

  return { allowed: true, buyerId, productId };
}
