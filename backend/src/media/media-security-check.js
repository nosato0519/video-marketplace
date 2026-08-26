const MIN_SECRET_LENGTH = 32;

export function validateMediaSecurityConfig(env = process.env) {
  if (!env.MEDIA_URL_SECRET) throw new Error('media_url_secret_missing');
  if (env.MEDIA_URL_SECRET.length < MIN_SECRET_LENGTH) throw new Error('media_url_secret_too_short');
  if (!env.MEDIA_STORAGE_DIR) throw new Error('media_storage_dir_missing');
  if (env.MEDIA_STORAGE_PROVIDER && env.MEDIA_STORAGE_PROVIDER !== 'local') {
    throw new Error('media_storage_provider_unsupported');
  }
  return true;
}
