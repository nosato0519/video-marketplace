import test from 'node:test';
import assert from 'node:assert/strict';
import { validateProductForPublishing, validateProductThumbnailAssets } from './publish-guard.js';

const validProduct = () => ({
  seller_id: 'seller-1',
  title: 'Test video',
  price_amount: 1200,
  price_currency: 'JPY',
  media_asset_id: 'asset-1',
});

const validAsset = () => ({
  id: 'asset-1',
  owner_user_id: 'seller-1',
  status: 'ready',
});

test('allows a seller-owned ready media asset to be published', () => {
  const result = validateProductForPublishing({ product: validProduct(), mediaAsset: validAsset() });
  assert.equal(result.allowed, true);
  assert.deepEqual(result.errors, []);
});

test('rejects a media asset owned by another seller', () => {
  const result = validateProductForPublishing({
    product: validProduct(),
    mediaAsset: { ...validAsset(), owner_user_id: 'seller-2' },
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['video_owner_mismatch']);
});

test('rejects a media asset that is still processing', () => {
  const result = validateProductForPublishing({
    product: validProduct(),
    mediaAsset: { ...validAsset(), status: 'processing' },
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['video_not_ready']);
});

test('rejects a deleted media asset', () => {
  const result = validateProductForPublishing({
    product: validProduct(),
    mediaAsset: { ...validAsset(), status: 'deleted' },
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['video_not_ready']);
});

test('rejects a product pointing at a different asset', () => {
  const result = validateProductForPublishing({
    product: { ...validProduct(), media_asset_id: 'asset-2' },
    mediaAsset: validAsset(),
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['video_mismatch']);
});

test('rejects publishing without a video', () => {
  const result = validateProductForPublishing({
    product: { ...validProduct(), media_asset_id: null },
    mediaAsset: null,
  });
  assert.equal(result.allowed, false);
  assert.deepEqual(result.errors, ['video_required']);
});

test('requires exactly one ready thumbnail with an allowed image type', () => {
  assert.deepEqual(validateProductThumbnailAssets([]), { allowed: false, error: 'product_thumbnail_required' });
  assert.deepEqual(validateProductThumbnailAssets([
    { status: 'ready', mime_type: 'image/png' },
    { status: 'ready', mime_type: 'image/jpeg' },
  ]), { allowed: false, error: 'product_thumbnail_invalid' });
  assert.deepEqual(validateProductThumbnailAssets([
    { status: 'processing', mime_type: 'image/png' },
  ]), { allowed: false, error: 'product_thumbnail_not_ready' });
  assert.deepEqual(validateProductThumbnailAssets([
    { status: 'ready', mime_type: 'application/pdf' },
  ]), { allowed: false, error: 'product_thumbnail_not_ready' });
  assert.deepEqual(validateProductThumbnailAssets([
    { status: 'ready', mime_type: 'image/png' },
  ]), { allowed: true, error: null });
});
