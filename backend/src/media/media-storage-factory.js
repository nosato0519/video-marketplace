import { createLocalMediaStorage } from './local-media-storage.js';

export function createConfiguredMediaStorage(env = process.env) {
  const provider = env.MEDIA_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    return createLocalMediaStorage({ rootDir: env.MEDIA_STORAGE_DIR });
  }

  throw new Error('media_storage_provider_unsupported');
}
