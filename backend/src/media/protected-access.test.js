import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeProtectedMedia } from './protected-access.js';

test('active entitlement allows protected media access', () => {
  const result = authorizeProtectedMedia({
    user: { id: 'buyer-1' },
    entitlement: { user_id: 'buyer-1', product_id: 'product-1', status: 'active' },
    product: { id: 'product-1', status: 'published', media_asset_id: 'asset-1' },
    asset: { id: 'asset-1', status: 'ready' },
  });
  assert.equal(result.allowed, true);
  assert.equal(result.status, 200);
});

test('revoked entitlement denies protected media access', () => {
  const result = authorizeProtectedMedia({
    user: { id: 'buyer-1' },
    entitlement: { user_id: 'buyer-1', product_id: 'product-1', status: 'revoked' },
    product: { id: 'product-1', status: 'published', media_asset_id: 'asset-1' },
    asset: { id: 'asset-1', status: 'ready' },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.status, 404);
  assert.equal(result.error, 'not_found');
});

test('different buyer cannot use another buyer entitlement', () => {
  const result = authorizeProtectedMedia({
    user: { id: 'buyer-2' },
    entitlement: { user_id: 'buyer-1', product_id: 'product-1', status: 'active' },
    product: { id: 'product-1', status: 'published', media_asset_id: 'asset-1' },
    asset: { id: 'asset-1', status: 'ready' },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.status, 404);
});
