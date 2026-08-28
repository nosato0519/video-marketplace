import test from 'node:test';
import assert from 'node:assert/strict';
import { authorizeProtectedMedia } from './protected-access.js';
import { canAccessPurchasedMedia, revokeEntitlement } from '../payments/entitlement-service.js';

const activeContext = () => ({
  user: { id: 'buyer-1' },
  entitlement: { user_id: 'buyer-1', product_id: 'product-1', status: 'active' },
  product: { id: 'product-1', status: 'published', media_asset_id: 'asset-1' },
  asset: { id: 'asset-1', status: 'ready' },
});

test('active entitlement allows protected media access', () => {
  const result = authorizeProtectedMedia(activeContext());
  assert.equal(result.allowed, true);
  assert.equal(result.status, 200);
});

test('revoking an active entitlement immediately removes media access', () => {
  const context = activeContext();
  assert.equal(canAccessPurchasedMedia(context), true);
  const revoked = revokeEntitlement(context.entitlement);
  assert.equal(revoked.status, 'revoked');
  assert.equal(canAccessPurchasedMedia({ ...context, entitlement: revoked }), false);
  const result = authorizeProtectedMedia({ ...context, entitlement: revoked });
  assert.equal(result.allowed, false);
  assert.equal(result.status, 404);
  assert.equal(result.error, 'not_found');
});

test('different buyer cannot use another buyer entitlement', () => {
  const result = authorizeProtectedMedia({ ...activeContext(), user: { id: 'buyer-2' } });
  assert.equal(result.allowed, false);
  assert.equal(result.status, 404);
});

test('blocked product denies protected media access even with active entitlement', () => {
  const context = activeContext();
  const result = authorizeProtectedMedia({
    ...context,
    product: { ...context.product, content_blocked: true },
  });
  assert.equal(result.allowed, false);
  assert.equal(result.status, 404);
});
