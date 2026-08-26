import crypto from 'node:crypto';

const DEFAULT_TTL_SECONDS = 300;

export function createPrivateMediaUrl({ assetId, storageKey, expiresInSeconds = DEFAULT_TTL_SECONDS, secret = process.env.MEDIA_URL_SECRET }) {
  if (!assetId || !storageKey) throw new Error('media_asset_invalid');
  if (!secret) throw new Error('media_url_secret_missing');

  const ttl = Number(expiresInSeconds);
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > DEFAULT_TTL_SECONDS) {
    throw new Error('media_url_ttl_invalid');
  }

  const expiresAt = Math.floor(Date.now() / 1000) + ttl;
  const payload = `${assetId}.${storageKey}.${expiresAt}`;
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  return {
    url: `/api/media/private/${encodeURIComponent(assetId)}?key=${encodeURIComponent(storageKey)}&expires=${expiresAt}&sig=${signature}`,
    expiresInSeconds: ttl,
  };
}

export function verifyPrivateMediaUrl({ assetId, storageKey, expiresAt, signature, secret = process.env.MEDIA_URL_SECRET, now = Math.floor(Date.now() / 1000) }) {
  if (!assetId || !storageKey || !signature || !secret) return false;

  const expires = Number(expiresAt);
  if (!Number.isInteger(expires) || expires <= now) return false;

  const payload = `${assetId}.${storageKey}.${expires}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');

  if (signature.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
