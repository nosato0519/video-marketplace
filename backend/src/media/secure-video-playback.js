import { createSecureVideoUrl } from '../orders/secure-video-url.js';

export async function createBuyerVideoPlayback({ buyerId, productId, videoId, baseUrl, ttlSeconds } = {}) {
  return createSecureVideoUrl({
    buyerId,
    productId,
    videoId,
    baseUrl,
    ttlSeconds,
  });
}
