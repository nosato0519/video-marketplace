const MIN_SECRET_LENGTH = 32;

function hasText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateMediaSecurityConfig(env = process.env) {
  const provider = env.MEDIA_STORAGE_PROVIDER || 'local';

  if (provider === 'local') {
    if (env.NODE_ENV === 'production') {
      throw new Error('media_storage_local_forbidden_in_production');
    }
    if (!hasText(env.MEDIA_STORAGE_DIR)) throw new Error('media_storage_dir_missing');
    if (env.MEDIA_URL_SECRET && env.MEDIA_URL_SECRET.length < MIN_SECRET_LENGTH) {
      throw new Error('media_url_secret_too_short');
    }
    return true;
  }

  if (provider === 's3') {
    if (!hasText(env.MEDIA_S3_BUCKET)) throw new Error('media_s3_bucket_missing');
    if (!hasText(env.MEDIA_S3_REGION)) throw new Error('media_s3_region_missing');
    if (!hasText(env.MEDIA_S3_ACCESS_KEY_ID)) throw new Error('media_s3_access_key_missing');
    if (!hasText(env.MEDIA_S3_SECRET_ACCESS_KEY)) throw new Error('media_s3_secret_key_missing');
    if (env.MEDIA_URL_SECRET && env.MEDIA_URL_SECRET.length < MIN_SECRET_LENGTH) {
      throw new Error('media_url_secret_too_short');
    }
    return true;
  }

  throw new Error('media_storage_provider_unsupported');
}
