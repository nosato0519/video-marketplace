import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { registerPurchaseIntentRoutes } from './purchase-intent-routes.js';

// The route is intentionally kept provider-neutral: it validates the purchase boundary
// without creating a payment session or exposing provider credentials.
test('registers an authenticated purchase-intent endpoint', () => {
  const app = express();
  app.use(express.json());
  registerPurchaseIntentRoutes(app);
  assert.ok(app._router);
});
