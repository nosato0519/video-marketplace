import crypto from 'node:crypto';
import { requireVideoAccess } from './video-access-service.js';

const DEFAULT_TTL_SECONDS = 300;

export async function createSecureVideoAccess({ buyerId, productId, videoId, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  if (!videoId) throw new Error('video_required');
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 900) {
    throw new Error('video_access_ttl_invalid');
  }

  await requireVideoAccess({ buyerId, productId });

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const nonce = crypto.randomBytes(18).toString('base64url');

  return Object.freeze({
    videoId: String(videoId),
    expiresAt,
    ttlSeconds,
    token: `${String(videoId)}.${expiresAt}.${nonce}`,
  });
}
