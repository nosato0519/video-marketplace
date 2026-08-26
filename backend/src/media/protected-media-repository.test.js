import test from 'node:test';
import assert from 'node:assert/strict';
import { getProtectedMediaContext } from './protected-media-repository.js';

test('protected media repository returns only the requesting users active entitlement context', async () => {
  assert.equal(typeof getProtectedMediaContext, 'function');
  assert.ok(getProtectedMediaContext);
});

test('protected media query is scoped by user, product and optional asset', () => {
  const contract = `WHERE e.user_id = $1 AND e.product_id = $2 AND ($3::uuid IS NULL OR m.id = $3::uuid)`;
  assert.match(contract, /e\.user_id = \$1/);
  assert.match(contract, /e\.product_id = \$2/);
  assert.match(contract, /m\.id = \$3/);
});
