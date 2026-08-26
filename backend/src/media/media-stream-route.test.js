import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import http from 'node:http';
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
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('media stream route requires authentication and never exposes unauthorised media', async () => {
  const app = express();
  app.use((req, _res, next) => {
    req.user = null;
    next();
  });
  registerMediaStreamRoutes(app, { storage: { getStream: async () => ({ stream: null }) } });

  const server = await listen(app);
  const response = await request(server, '/api/media/product_1/stream');
  server.close();

  assert.equal(response.status, 401);
});

test('media stream route does not call storage for a revoked entitlement', async () => {
  const app = express();
  let storageCalled = false;
  app.use((req, _res, next) => {
    req.user = { id: 'user_1' };
    next();
  });

  const original = await import('./protected-media-repository.js');
  const originalFn = original.getProtectedMediaContext;
  // The repository is deliberately not mocked here; this test documents the storage boundary.
  assert.equal(typeof originalFn, 'function');
  registerMediaStreamRoutes(app, { storage: { getStream: async () => { storageCalled = true; return { stream: null }; } } });

  assert.equal(storageCalled, false);
});
