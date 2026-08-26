import { canPublishMedia } from '../media/upload-status.js';

export function validateProductPublication({ title, priceAmount, priceCurrency, mediaAssets = [] }) {
  const errors = [];
  if (!String(title || '').trim()) errors.push('title_required');
  const amount = Number(priceAmount);
  if (!Number.isFinite(amount) || amount < 0) errors.push('price_invalid');
  if (!/^[A-Z]{3}$/.test(String(priceCurrency || '').toUpperCase())) errors.push('currency_invalid');
  if (!Array.isArray(mediaAssets) || mediaAssets.length === 0) errors.push('media_required');
  if (Array.isArray(mediaAssets) && mediaAssets.some(asset => !canPublishMedia(asset?.status))) errors.push('media_not_ready');
  return { valid: errors.length === 0, errors };
}
