import test from 'node:test';
import assert from 'node:assert/strict';
import { createProtectedMediaResponse } from './protected-media-service.js';

test('protected media service signs a URL only after authorization succeeds', async () => {
  const result = await createProtectedMediaResponse({
    user: { id: 'user_1' },
    entitlement: { user_id: 'user_1', status: 'active' },
    product: { status: 'published' },
    asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4' },
    secret: 'test-secret',
  });

  assert.equal(result.assetId, 'asset_1');
  assert.equal(result.expiresInSeconds, 300);
  assert.match(result.url, /^\/api\/media\/private\/asset_1\?/);
});

test('protected media service never signs a URL for revoked entitlement', async () => {
  const result = await createProtectedMediaResponse({
    user: { id: 'user_1' },
    entitlement: { user_id: 'user_1', status: 'revoked' },
    product: { status: 'published' },
    asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4' },
    secret: 'test-secret',
  });

  assert.deepEqual(result, { allowed: false, status: 404, error: 'not_found' });
});

test('protected media service never signs a URL for another user entitlement', async () => {
  const result = await createProtectedMediaResponse({
    user: { id: 'user_2' },
    entitlement: { user_id: 'user_1', status: 'active' },
    product: { status: 'published' },
    asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4' },
    secret: 'test-secret',
  });

  assert.deepEqual(result, { allowed: false, status: 404, error: 'not_found' });
});
