import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
import { Readable } from 'node:stream';
import { registerMediaStreamRoutes } from './media-stream-route.js';

function listen(app) {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, path, headers = {}) {
  return new Promise((resolve, reject) => {
    const address = server.address();
    const req = http.request({ port: address.port, path, headers }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

function activeContext(byteSize = 6) {
  return {
    entitlement: { user_id: 'user_1', product_id: 'product_1', status: 'active' },
    product: { id: 'product_1', status: 'published', media_asset_id: 'asset_1' },
    asset: { id: 'asset_1', status: 'ready', storage_key: 'private/video.mp4', mime_type: 'video/mp4', byte_size: byteSize },
  };
}

function registerForUser(app, options = {}) {
  app.use((req, _res, next) => {
    req.user = options.user ?? { id: 'user_1' };
    next();
  });
  return registerMediaStreamRoutes(app, {
    getContext: options.getContext,
    storage: options.storage ?? { getStream: async () => ({ stream: Readable.from([Buffer.from('secret')]) }) },
  });
}

test('media stream route requires authentication', async () => {
  const app = express();
  app.use((req, _res, next) => { req.user = null; next(); });
  registerMediaStreamRoutes(app, { storage: { getStream: async () => ({ stream: null }) } });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream');
  server.close();

  assert.equal(response.status, 401);
});

test('media stream route returns protected media to the entitled purchaser', async () => {
  const app = express();
  registerForUser(app, { getContext: async () => activeContext() });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream');
  server.close();

  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'video/mp4');
  assert.equal(response.headers['content-disposition'], 'inline');
  assert.equal(response.headers['cache-control'], 'private, no-store, max-age=0');
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.body.toString(), 'secret');
});

test('media stream route never reaches storage after entitlement is revoked', async () => {
  const app = express();
  let storageCalled = false;
  registerForUser(app, {
    getContext: async () => ({ ...activeContext(), entitlement: { ...activeContext().entitlement, status: 'revoked' } }),
    storage: { getStream: async () => { storageCalled = true; return { stream: Readable.from(['secret']) }; } },
  });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream');
  server.close();

  assert.equal(response.status, 404);
  assert.equal(storageCalled, false);
});

test('media stream route supports byte ranges for video seeking', async () => {
  const app = express();
  let requestedRange;
  registerForUser(app, {
    getContext: async () => activeContext(10),
    storage: { getStream: async ({ range }) => { requestedRange = range; return { stream: Readable.from([Buffer.from('range')]) }; } },
  });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream', { Range: 'bytes=2-6' });
  server.close();

  assert.equal(response.status, 206);
  assert.deepEqual(requestedRange, { start: 2, end: 6 });
  assert.equal(response.headers['content-range'], 'bytes 2-6/10');
  assert.equal(response.headers['content-length'], '5');
});

test('media stream route rejects malformed ranges without touching storage', async () => {
  const app = express();
  let storageCalled = false;
  registerForUser(app, {
    getContext: async () => activeContext(10),
    storage: { getStream: async () => { storageCalled = true; return { stream: Readable.from(['secret']) }; } },
  });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream', { Range: 'bytes=invalid' });
  server.close();

  assert.equal(response.status, 416);
  assert.equal(response.headers['content-range'], 'bytes */10');
  assert.equal(storageCalled, false);
});

test('media stream route rejects invalid media size before storage access', async () => {
  const app = express();
  let storageCalled = false;
  registerForUser(app, {
    getContext: async () => activeContext(Number.MAX_SAFE_INTEGER + 1),
    storage: { getStream: async () => { storageCalled = true; return { stream: Readable.from(['secret']) }; } },
  });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream');
  server.close();

  assert.equal(response.status, 500);
  assert.equal(storageCalled, false);
});
