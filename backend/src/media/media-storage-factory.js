import { createLocalMediaStorage } from './local-media-storage.js';
import { createMediaStorage } from './media-storage.js';
import { createS3MediaStorage } from './s3-media-storage.js';

export function createConfiguredMediaStorage(env = process.env) {
  const provider = env.MEDIA_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    if (env.NODE_ENV === 'production') throw new Error('media_storage_local_forbidden_in_production');
    const storage = createLocalMediaStorage({ rootDir: env.MEDIA_STORAGE_DIR });
    return createMediaStorage({
      getObjectStream: storage.getStream,
      getObjectMetadata: storage.getMetadata,
      putObjectStream: storage.putStream,
      deleteObject: storage.deleteObject,
    });
  }

  if (provider === 's3') {
    const storage = createS3MediaStorage({
      bucket: env.MEDIA_S3_BUCKET,
      region: env.MEDIA_S3_REGION,
      accessKeyId: env.MEDIA_S3_ACCESS_KEY_ID,
      secretAccessKey: env.MEDIA_S3_SECRET_ACCESS_KEY,
      endpoint: env.MEDIA_S3_ENDPOINT,
    });
    return createMediaStorage({
      getObjectStream: storage.getStream,
      getObjectMetadata: storage.getMetadata,
      putObjectStream: storage.putStream,
      deleteObject: storage.deleteObject,
    });
  }

  throw new Error('media_storage_provider_unsupported');
}
