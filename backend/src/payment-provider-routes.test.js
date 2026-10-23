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

test('registers environment-managed payment provider endpoints behind the admin guard', () => {
  const app = createFakeApp();
  const guard = (_req, _res, next) => next();
  registerPaymentProviderRoutes(app, { requireAdmin: guard });

  assert.deepEqual(app.routes.get.map((route) => route.path), [
    '/api/payment-providers',
    '/api/admin/payment-providers',
    '/api/admin/payment-providers/settings',
  ]);
  assert.equal(app.routes.get[0].handlers.length, 1);
  assert.equal(app.routes.get[0].handlers[0] === guard, false);
  assert.deepEqual(app.routes.post.map((route) => route.path), [
    '/api/admin/payment-providers/validate',
    '/api/admin/payment-providers/configure',
  ]);
  assert.deepEqual(app.routes.delete.map((route) => route.path), [
    '/api/admin/payment-providers/:providerId',
  ]);

  for (const group of Object.values(app.routes)) {
    for (const route of group) {
      assert.equal(route.handlers[0], guard);
      assert.equal(typeof route.handlers[route.handlers.length - 1], 'function');
    }
  }
});

test('legacy payment write endpoints explain that configuration is deployment-managed', () => {
  const app = createFakeApp();
  registerPaymentProviderRoutes(app, { requireAdmin: (_req, _res, next) => next() });
  const configure = app.routes.post.find((route) => route.path.endsWith('/configure'));
  const response = {
    statusCode: 200,
    payload: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.payload = payload; return this; },
  };
  configure.handlers.at(-1)({}, response);

  assert.equal(response.statusCode, 409);
  assert.equal(response.payload.error, 'payment_configuration_managed_by_environment');
});
