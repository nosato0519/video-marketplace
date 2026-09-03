import test from 'node:test';
import assert from 'node:assert/strict';
import { validateMediaSecurityConfig } from './media-security-check.js';

const validSecret = '0123456789abcdef0123456789abcdef';

test('requires a private media storage directory for local development', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_STORAGE_PROVIDER: 'local' }),
    /media_storage_dir_missing/
  );
});

test('rejects a signing secret shorter than 32 characters when supplied', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_STORAGE_PROVIDER: 'local', MEDIA_STORAGE_DIR: '/tmp/media', MEDIA_URL_SECRET: 'too-short' }),
    /media_url_secret_too_short/
  );
});

test('accepts local development configuration without the legacy signing secret', () => {
  assert.equal(
    validateMediaSecurityConfig({ MEDIA_STORAGE_PROVIDER: 'local', MEDIA_STORAGE_DIR: '/tmp/media' }),
    true
  );
});

test('forbids local storage in production', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ NODE_ENV: 'production', MEDIA_STORAGE_PROVIDER: 'local', MEDIA_STORAGE_DIR: '/tmp/media' }),
    /media_storage_local_forbidden_in_production/
  );
});

test('requires S3 credentials for production storage', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ NODE_ENV: 'production', MEDIA_STORAGE_PROVIDER: 's3', MEDIA_S3_BUCKET: 'bucket', MEDIA_S3_REGION: 'auto', MEDIA_S3_ACCESS_KEY_ID: 'access' }),
    /media_s3_secret_key_missing/
  );
});

test('requires an S3 region for production storage', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ NODE_ENV: 'production', MEDIA_STORAGE_PROVIDER: 's3', MEDIA_S3_BUCKET: 'bucket', MEDIA_S3_ACCESS_KEY_ID: 'access', MEDIA_S3_SECRET_ACCESS_KEY: 'secret' }),
    /media_s3_region_missing/
  );
});

test('accepts configured S3 storage', () => {
  assert.equal(
    validateMediaSecurityConfig({
      NODE_ENV: 'production',
      MEDIA_STORAGE_PROVIDER: 's3',
      MEDIA_S3_BUCKET: 'bucket',
      MEDIA_S3_REGION: 'auto',
      MEDIA_S3_ACCESS_KEY_ID: 'access',
      MEDIA_S3_SECRET_ACCESS_KEY: 'secret',
    }),
    true
  );
});

test('rejects unsupported providers', () => {
  assert.throws(
    () => validateMediaSecurityConfig({ MEDIA_STORAGE_PROVIDER: 'public-cdn', MEDIA_STORAGE_DIR: '/tmp/media' }),
    /media_storage_provider_unsupported/
  );
});
