import { authorizeProtectedMedia, buildPrivateMediaResponse } from './protected-access.js';
import { createPrivateMediaUrl } from './private-media-url.js';

export async function createProtectedMediaResponse({ user, entitlement, product, asset, secret, expiresInSeconds = 300 }) {
  const authorization = authorizeProtectedMedia({ user, entitlement, product, asset });
  if (!authorization.allowed) {
    return authorization;
  }

  const signed = createPrivateMediaUrl({
    assetId: asset.id,
    storageKey: asset.storage_key,
    expiresInSeconds,
    secret,
  });

  return buildPrivateMediaResponse({ asset, signedUrl: signed.url });
}
