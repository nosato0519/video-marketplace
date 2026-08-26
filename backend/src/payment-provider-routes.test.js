import test from 'node:test';
import assert from 'node:assert/strict';
import { registerPaymentProviderRoutes } from './payment-provider-routes.js';

function createFakeApp() {
  const routes = { get: [], post: [], delete: [] };
  return {
    routes,
    get(path, ...handlers) { routes.get.push({ path, handlers }); },
    post(path, ...handlers) { routes.post.push({ path, handlers }); },
    delete(path, ...handlers) { routes.delete.push({ path, handlers }); },
  };
}

test('registers buyer-facing payment provider management endpoints', () => {
  const app = createFakeApp();
  let guarded = 0;
  registerPaymentProviderRoutes(app, {
    requireAdmin: (_req, _res, next) => { guarded += 1; next(); },
  });

  assert.deepEqual(app.routes.get.map((route) => route.path), [
    '/api/admin/payment-providers',
    '/api/admin/payment-providers/settings',
  ]);
  assert.deepEqual(app.routes.post.map((route) => route.path), [
    '/api/admin/payment-providers/validate',
    '/api/admin/payment-providers/configure',
  ]);
  assert.deepEqual(app.routes.delete.map((route) => route.path), [
    '/api/admin/payment-providers/:providerId',
  ]);

  for (const group of Object.values(app.routes)) {
    for (const route of group) assert.equal(route.handlers.length > 0, true);
  }
  assert.equal(guarded, 0);
});
