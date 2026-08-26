import crypto from 'node:crypto';

export function verifyVideoDeliverySignature({ videoId, expires, signature, secret = process.env.VIDEO_ACCESS_SECRET, now = Math.floor(Date.now() / 1000) } = {}) {
  if (!secret) throw new Error('video_access_secret_not_configured');
  if (!videoId || !expires || !signature) throw new Error('video_delivery_signature_required');

  const expiresAt = Number(expires);
  if (!Number.isSafeInteger(expiresAt)) throw new Error('video_delivery_expiry_invalid');
  if (expiresAt <= now) throw new Error('video_delivery_url_expired');

  const payload = `${String(videoId)}.${expiresAt}`;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  const provided = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);

  if (provided.length !== expectedBuffer.length || !crypto.timingSafeEqual(provided, expectedBuffer)) {
    throw new Error('video_delivery_signature_invalid');
  }

  return Object.freeze({ videoId: String(videoId), expiresAt, valid: true });
}
