const ALLOWED_VIDEO_TYPES = new Set(['video/mp4','video/webm','video/quicktime']);
const ALLOWED_EXTENSIONS = new Set(['.mp4','.webm','.mov']);

export function validateMediaUpload({ filename, mimeType, byteSize, maxBytes }) {
  if (!filename || typeof filename !== 'string') throw new Error('media_filename_required');
  if (!mimeType || !ALLOWED_VIDEO_TYPES.has(mimeType.toLowerCase())) throw new Error('media_type_not_allowed');
  const lower = filename.toLowerCase();
  if (![...ALLOWED_EXTENSIONS].some(ext => lower.endsWith(ext))) throw new Error('media_extension_not_allowed');
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) throw new Error('media_size_invalid');
  if (Number.isFinite(maxBytes) && byteSize > maxBytes) throw new Error('media_size_exceeded');
  return { filename: filename.replace(/[\\/]/g, '_').replace(/[^\p{L}\p{N}._ -]/gu, '_'), mimeType: mimeType.toLowerCase(), byteSize };
}

export function buildPrivateStorageKey({ sellerId, assetId, extension }) {
  const safeSeller = String(sellerId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeAsset = String(assetId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeExt = String(extension).toLowerCase().replace(/[^a-z0-9.]/g, '');
  return `private/media/${safeSeller}/${safeAsset}${safeExt}`;
}
