import { canPublishMedia } from '../media/upload-status.js';

export function validateProductForPublishing({ product, mediaAsset }) {
  const errors = [];
  if (!product) errors.push('product_required');
  if (!product?.title?.trim()) errors.push('title_required');

  const price = Number(product?.price_amount);
  if (!Number.isFinite(price) || price <= 0) errors.push('price_invalid');

  const currency = String(product?.price_currency || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) errors.push('currency_invalid');

  if (!product?.media_asset_id || !mediaAsset) errors.push('video_required');
  else if (String(mediaAsset.id) !== String(product.media_asset_id)) errors.push('video_mismatch');
  else if (String(mediaAsset.owner_user_id) !== String(product.seller_id)) errors.push('video_owner_mismatch');
  else if (!canPublishMedia(mediaAsset.status)) errors.push('video_not_ready');

  return { allowed: errors.length === 0, errors };
}
