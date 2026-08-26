import { canPublishMedia } from '../media/upload-status.js';

export function validateProductForPublishing({ product, mediaAssets = [] }) {
  const errors = [];
  if (!product) errors.push('product_required');
  if (!product?.title?.trim()) errors.push('title_required');
  const price = Number(product?.price);
  if (!Number.isFinite(price) || price <= 0) errors.push('price_invalid');
  if (!/^[A-Z]{3}$/.test(String(product?.currency || ''))) errors.push('currency_invalid');
  if (!mediaAssets.length) errors.push('video_required');
  if (mediaAssets.some(asset => !canPublishMedia(asset.status))) errors.push('video_not_ready');
  return { allowed: errors.length === 0, errors };
}
