import crypto from 'node:crypto';
import { requireVideoAccess } from './video-access-service.js';

const DEFAULT_TTL_SECONDS = 300;

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

export async function createSecureVideoUrl({ buyerId, productId, videoId, baseUrl, secret = process.env.VIDEO_ACCESS_SECRET, ttlSeconds = DEFAULT_TTL_SECONDS } = {}) {
  if (!secret) throw new Error('video_access_secret_not_configured');
  if (!baseUrl) throw new Error('video_delivery_base_url_required');
  if (!videoId) throw new Error('video_required');
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 900) throw new Error('video_access_ttl_invalid');

  await requireVideoAccess({ buyerId, productId });

  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${String(videoId)}.${expiresAt}`;
  const signature = signPayload(payload, secret);
  const url = new URL(`/api/videos/${encodeURIComponent(String(videoId))}/stream`, baseUrl);
  url.searchParams.set('expires', String(expiresAt));
  url.searchParams.set('signature', signature);

  return Object.freeze({ url: url.toString(), expiresAt, ttlSeconds });
}
