const MAX_VIDEO_BYTES = 20 * 1024 * 1024 * 1024;
const ALLOWED_VIDEO_MIME_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export function validateUploadMetadata({ mimeType, byteSize, filename }) {
  if (!ALLOWED_VIDEO_MIME_TYPES.has(mimeType)) {
    throw new Error('unsupported_media_type');
  }
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0 || byteSize > MAX_VIDEO_BYTES) {
    throw new Error('invalid_media_size');
  }
  if (typeof filename !== 'string' || filename.length === 0 || filename.length > 255) {
    throw new Error('invalid_filename');
  }
}

export function createPrivateStorageKey(ownerUserId, assetId) {
  if (!ownerUserId || !assetId) throw new Error('invalid_storage_identity');
  return `private/${ownerUserId}/${assetId}`;
}

export function canAccessOriginalMedia({ mediaStatus, isOwner, hasEntitlement }) {
  if (mediaStatus !== 'ready') return false;
  return Boolean(isOwner || hasEntitlement);
}
