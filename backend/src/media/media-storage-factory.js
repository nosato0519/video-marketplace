import { createLocalMediaStorage } from './local-media-storage.js';
import { createMediaStorage } from './media-storage.js';
import { createS3MediaStorage } from './s3-media-storage.js';

function createUnavailableMediaStorage() {
  const unavailable = async () => {
    throw Object.assign(new Error('media_storage_configuration_missing'), { statusCode: 503 });
  };

  return {
    getStream: unavailable,
    getMetadata: unavailable,
    putStream: unavailable,
    deleteObject: unavailable,
  };
}

export function createConfiguredMediaStorage(env = process.env) {
  const provider = env.MEDIA_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    if (env.NODE_ENV === 'production' && !env.MEDIA_STORAGE_DIR) {
      return createUnavailableMediaStorage();
    }
    const storage = createLocalMediaStorage({ rootDir: env.MEDIA_STORAGE_DIR });
    return createMediaStorage({
      getObjectStream: storage.getStream,
      getObjectMetadata: storage.getMetadata,
      putObjectStream: storage.putStream,
      deleteObject: storage.deleteObject,
    });
  }

  if (provider === 's3') {
    if (!env.MEDIA_S3_BUCKET || !env.MEDIA_S3_REGION || !env.MEDIA_S3_ACCESS_KEY_ID || !env.MEDIA_S3_SECRET_ACCESS_KEY) {
      return createUnavailableMediaStorage();
    }
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

  return createUnavailableMediaStorage();
}
