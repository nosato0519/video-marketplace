import { createLocalMediaStorage } from './local-media-storage.js';
import { createMediaStorage } from './media-storage.js';

export function createConfiguredMediaStorage(env = process.env) {
  const provider = env.MEDIA_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    const storage = createLocalMediaStorage({ rootDir: env.MEDIA_STORAGE_DIR });
    return createMediaStorage({
      getObjectStream: storage.getStream,
      getObjectMetadata: storage.getMetadata,
      putObjectStream: storage.putStream,
    });
  }

  throw new Error('media_storage_provider_unsupported');
}
