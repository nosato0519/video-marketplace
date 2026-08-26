import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerProtectedMediaRoutes } from './protected-media-routes.js';

async function request({ user, asset, product, entitlement }) {
  const app = express();
  app.use((req, _res, next) => { req.user = user ?? null; next(); });
  registerProtectedMediaRoutes(app, {
    secret: 'test-secret',
    getAsset: async () => asset,
    getProduct: async () => product,
    getEntitlement: async () => entitlement,
  });
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try {
    return await fetch(`http://127.0.0.1:${port}/api/media/assets/${asset?.id ?? 'missing'}/access`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

test('protected media route returns a signed URL for an authorized buyer', async () => {
  const response = await request({
    user: { id: 'user_1' },
    asset: { id: 'asset_1', product_id: 'product_1', status: 'ready', storage_key: 'private/video.mp4' },
    product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
    entitlement: { user_id: 'user_1', product_id: 'product_1', status: 'active' },
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.match(body.data.url, /^\/api\/media\/private\/asset_1\?/);
});

test('protected media route denies access after entitlement is revoked', async () => {
  const response = await request({
    user: { id: 'user_1' },
    asset: { id: 'asset_1', product_id: 'product_1', status: 'ready', storage_key: 'private/video.mp4' },
    product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
    entitlement: { user_id: 'user_1', product_id: 'product_1', status: 'revoked' },
  });
  assert.equal(response.status, 404);
});

test('protected media route requires authentication', async () => {
  const response = await request({
    asset: { id: 'asset_1', product_id: 'product_1', status: 'ready', storage_key: 'private/video.mp4' },
    product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
    entitlement: null,
  });
  assert.equal(response.status, 401);
});
