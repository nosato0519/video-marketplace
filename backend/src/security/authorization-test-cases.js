import { assertPermission, assertOwnership } from './authorization-policy.js';

const CASES = [
  { name: 'buyer cannot moderate', run: () => assertPermission({ user: { id: 'u1', role: 'buyer' }, permission: 'moderation:reports' }), expected: 'reject' },
  { name: 'seller cannot review payouts', run: () => assertPermission({ user: { id: 'u1', role: 'seller' }, permission: 'payout:review' }), expected: 'reject' },
  { name: 'admin can review payouts', run: () => assertPermission({ user: { id: 'u1', role: 'admin' }, permission: 'payout:review' }), expected: 'allow' },
  { name: 'owner can access own resource', run: () => assertOwnership({ user: { id: 'u1' }, resource: { user_id: 'u1' } }), expected: 'allow' },
  { name: 'non-owner is denied', run: () => assertOwnership({ user: { id: 'u2' }, resource: { user_id: 'u1' } }), expected: 'reject' },
];

export function runAuthorizationRegressionSuite() {
  const results = CASES.map((testCase) => {
    try {
      testCase.run();
      return { name: testCase.name, expected: testCase.expected, actual: 'allow', passed: testCase.expected === 'allow' };
    } catch {
      return { name: testCase.name, expected: testCase.expected, actual: 'reject', passed: testCase.expected === 'reject' };
    }
  });

  return {
    passed: results.every((result) => result.passed),
    total: results.length,
    failed: results.filter((result) => !result.passed),
    results,
  };
}
