import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfiguredMediaStorage } from './media-storage-factory.js';

test('creates local storage in development when its directory is configured', () => {
  const storage = createConfiguredMediaStorage({
    NODE_ENV: 'development',
    MEDIA_STORAGE_PROVIDER: 'local',
    MEDIA_STORAGE_DIR: '/tmp/video-marketplace-media',
  });
  assert.equal(typeof storage.getStream, 'function');
  assert.equal(typeof storage.getMetadata, 'function');
});

test('blocks local storage in production with an actionable error', async () => {
  const storage = createConfiguredMediaStorage({
    NODE_ENV: 'production',
    MEDIA_STORAGE_PROVIDER: 'local',
    MEDIA_STORAGE_DIR: '/tmp/video-marketplace-media',
  });
  await assert.rejects(storage.putStream({ storageKey: 'verification-documents/test.pdf', stream: null }), {
    message: 'media_storage_local_forbidden_in_production',
    statusCode: 503,
  });
});

test('reports the exact missing S3-compatible storage settings', async () => {
  const storage = createConfiguredMediaStorage({
    NODE_ENV: 'production',
    MEDIA_STORAGE_PROVIDER: 's3',
    MEDIA_S3_BUCKET: 'bucket',
  });
  await assert.rejects(storage.putStream({ storageKey: 'verification-documents/test.pdf', stream: null }), {
    message: 'media_s3_configuration_missing:MEDIA_S3_REGION,MEDIA_S3_ACCESS_KEY_ID,MEDIA_S3_SECRET_ACCESS_KEY',
    statusCode: 503,
  });
});

test('rejects unknown storage providers instead of silently falling back', async () => {
  const storage = createConfiguredMediaStorage({
    NODE_ENV: 'production',
    MEDIA_STORAGE_PROVIDER: 'unknown',
  });
  await assert.rejects(storage.putStream({ storageKey: 'verification-documents/test.pdf', stream: null }), {
    message: 'media_storage_provider_unsupported',
    statusCode: 503,
  });
});
