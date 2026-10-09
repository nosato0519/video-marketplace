import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerConfiguredMediaStreamRoutes } from './media-stream-app.js';

test('configured media stream wiring uses the local provider explicitly', () => {
  const app = express();
  const storage = registerConfiguredMediaStreamRoutes(app, {
    MEDIA_STORAGE_PROVIDER: 'local',
    MEDIA_STORAGE_DIR: '/tmp/video-marketplace-media',
  });

  assert.equal(typeof storage.getStream, 'function');
  assert.equal(typeof storage.getMetadata, 'function');
  assert.ok(app.router);
});

test('configured media stream wiring fails closed for an unknown provider', async () => {
  const app = express();
  const storage = registerConfiguredMediaStreamRoutes(app, {
    MEDIA_STORAGE_PROVIDER: 'unknown',
    MEDIA_STORAGE_DIR: '/tmp/video-marketplace-media',
  });

  await assert.rejects(
    storage.putStream({ storageKey: 'test-object', stream: null }),
    {
      message: 'media_storage_provider_unsupported',
      statusCode: 503,
    }
  );
});
