import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMediaUrl, verifyPrivateMediaUrl } from './private-media-url.js';

test('creates a short-lived signed media URL', () => {
  const result = createPrivateMediaUrl({ assetId: 'asset_123', storageKey: 'private/video.mp4', expiresInSeconds: 300, secret: 'test-secret' });
  const url = new URL(`http://localhost${result.url}`);
  assert.equal(result.expiresInSeconds, 300);
  assert.equal(verifyPrivateMediaUrl({
    assetId: 'asset_123',
    storageKey: url.searchParams.get('key'),
    expiresAt: url.searchParams.get('expires'),
    signature: url.searchParams.get('sig'),
    secret: 'test-secret',
  }), true);
});

test('rejects an expired signed media URL', () => {
  assert.equal(verifyPrivateMediaUrl({ assetId: 'asset_123', storageKey: 'private/video.mp4', expiresAt: 1000, signature: 'invalid', secret: 'test-secret', now: 1001 }), false);
});

test('rejects a signature generated for a different asset', () => {
  const result = createPrivateMediaUrl({ assetId: 'asset_123', storageKey: 'private/video.mp4', expiresInSeconds: 300, secret: 'test-secret' });
  const url = new URL(`http://localhost${result.url}`);
  assert.equal(verifyPrivateMediaUrl({
    assetId: 'asset_other',
    storageKey: url.searchParams.get('key'),
    expiresAt: url.searchParams.get('expires'),
    signature: url.searchParams.get('sig'),
    secret: 'test-secret',
  }), false);
});

test('never allows a TTL longer than five minutes', () => {
  assert.throws(() => createPrivateMediaUrl({ assetId: 'asset_123', storageKey: 'private/video.mp4', expiresInSeconds: 301, secret: 'test-secret' }), /media_url_ttl_invalid/);
});
