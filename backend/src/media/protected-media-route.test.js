import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { registerProtectedMediaRoutes } from './protected-media-route.js';

async function withServer(dependencies, run) {
  const app = express();
  app.use((req, _res, next) => { req.user = { id: 'user_1' }; next(); });
  registerProtectedMediaRoutes(app, { secret: 'test-secret', ...dependencies });
  app.use((error, _req, res, _next) => res.status(500).json({ error: { code: 'INTERNAL_ERROR' } }));
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  try { return await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

test('protected media route returns a signed URL for an authorized buyer', async () => {
  await withServer({
    getProtectedMediaForUser: async () => ({
      entitlement: { user_id: 'user_1', product_id: 'product_1', status: 'active' },
      product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
      asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4' },
    }),
  }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/media/product_1`);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.assetId, 'asset_1');
    assert.match(body.url, /^\/api\/media\/private\/asset_1\?/);
  });
});

test('protected media route hides unauthorized media behind 404', async () => {
  await withServer({ getProtectedMediaForUser: async () => null }, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/media/product_1`);
    assert.equal(response.status, 404);
  });
});