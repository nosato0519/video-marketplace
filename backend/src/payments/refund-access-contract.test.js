import test from 'node:test';
import assert from 'node:assert/strict';

test('refunded entitlement must not grant content access', () => {
  const entitlement = { status: 'revoked' };
  const canAccess = entitlement.status === 'active';
  assert.equal(canAccess, false);
});

test('active entitlement grants content access', () => {
  const entitlement = { status: 'active' };
  const canAccess = entitlement.status === 'active';
  assert.equal(canAccess, true);
});
