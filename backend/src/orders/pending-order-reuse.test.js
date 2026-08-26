import test from 'node:test';
import assert from 'node:assert/strict';
import { findReusablePendingOrder } from './pending-order-reuse.js';

test('exports the reusable pending-order lookup', () => {
  assert.equal(typeof findReusablePendingOrder, 'function');
});
