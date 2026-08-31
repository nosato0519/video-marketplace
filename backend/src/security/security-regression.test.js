import test from 'node:test';
import assert from 'node:assert/strict';
import { runAuthorizationRegressionSuite } from './authorization-test-cases.js';
import { runAdminAccountActionRegressionSuite } from './admin-account-action-test-cases.js';
import { runAuditIntegrityRegressionSuite } from './audit-log-integrity-test-cases.js';

test('authorization regression suite passes', () => {
  const result = runAuthorizationRegressionSuite();
  assert.equal(result.passed, true);
  assert.equal(result.failed.length, 0);
});

test('admin account action regression suite passes', () => {
  const result = runAdminAccountActionRegressionSuite();
  assert.equal(result.passed, true);
  assert.equal(result.failed.length, 0);
});

test('audit log integrity regression suite accepts valid chain and rejects tampering', () => {
  const result = runAuditIntegrityRegressionSuite();
  assert.equal(result.validChainAccepted, true);
  assert.equal(result.tamperedChainRejected, true);
});
