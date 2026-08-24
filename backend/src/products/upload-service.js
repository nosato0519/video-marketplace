import crypto from 'node:crypto';
import { validateUploadMetadata, createPrivateStorageKey } from './upload-policy.js';

export function preparePrivateUpload({ user, assetId, mimeType, byteSize, filename }) {
  if (!user) throw new Error('authentication_required');
  if (user.role !== 'seller' && user.role !== 'admin') throw new Error('forbidden');

  validateUploadMetadata({ mimeType, byteSize, filename });
  const storageKey = createPrivateStorageKey(user.id, assetId);

  return {
    assetId,
    ownerUserId: user.id,
    storageKey,
    mimeType,
    byteSize,
    originalFilename: filename,
    uploadToken: crypto.randomBytes(24).toString('base64url'),
    status: 'private',
  };
}
