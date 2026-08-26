import { getPublicProductDetail as queryPublicProductDetail } from './product-detail-policy.js';

export async function getPublicProductDetail({ productId, locale = 'en' }) {
  return queryPublicProductDetail({ productId, locale });
}
