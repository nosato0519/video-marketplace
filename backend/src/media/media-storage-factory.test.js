import test from 'node:test';
import assert from 'node:assert/strict';
import { createConfiguredMediaStorage } from './media-storage-factory.js';

test('defaults to the local provider for development', () => {
  const storage = createConfiguredMediaStorage({ MEDIA_STORAGE_DIR: '/tmp/video-marketplace-media' });
  assert.equal(typeof storage.getStream, 'function');
  assert.equal(typeof storage.getMetadata, 'function');
});

test('rejects unknown storage providers instead of silently falling back', () => {
  assert.throws(
    () => createConfiguredMediaStorage({ MEDIA_STORAGE_PROVIDER: 'unknown', MEDIA_STORAGE_DIR: '/tmp/media' }),
    /media_storage_provider_unsupported/
  );
});
