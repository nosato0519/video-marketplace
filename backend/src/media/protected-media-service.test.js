import test from 'node:test';
import assert from 'node:assert/strict';
import { createProtectedMediaResponse } from './protected-media-service.js';

function fixture() {
  return {
    user: { id: 'user_1' },
    entitlement: { user_id: 'user_1', product_id: 'product_1', status: 'active' },
    product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
    asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4' },
    secret: 'test-secret',
  };
}

test('protected media service signs a URL only after authorization succeeds', async () => {
  const result = await createProtectedMediaResponse(fixture());
  assert.equal(result.assetId, 'asset_1');
  assert.equal(result.expiresInSeconds, 300);
  assert.match(result.url, /^\/api\/media\/private\/asset_1\?/);
});

test('protected media service never signs a URL for revoked entitlement', async () => {
  const result = await createProtectedMediaResponse({ ...fixture(), entitlement: { ...fixture().entitlement, status: 'revoked' } });
  assert.deepEqual(result, { allowed: false, status: 404, error: 'not_found' });
});

test('protected media service never signs a URL for another user entitlement', async () => {
  const result = await createProtectedMediaResponse({ ...fixture(), user: { id: 'user_2' } });
  assert.deepEqual(result, { allowed: false, status: 404, error: 'not_found' });
});