import { applyAdminAccountAction } from './admin-account-action-application.js';

const CASES = [
  { name: 'admin can suspend', actor: { id: 'a1', role: 'admin' }, target: { id: 'u1', status: 'active' }, action: 'suspend', expected: 'suspended' },
  { name: 'admin can lock', actor: { id: 'a1', role: 'admin' }, target: { id: 'u1', status: 'active' }, action: 'lock', expected: 'locked' },
  { name: 'admin can restore', actor: { id: 'a1', role: 'admin' }, target: { id: 'u1', status: 'locked' }, action: 'restore', expected: 'active' },
  { name: 'seller cannot suspend', actor: { id: 's1', role: 'seller' }, target: { id: 'u1', status: 'active' }, action: 'suspend', expected: 'reject' },
  { name: 'admin cannot act on self', actor: { id: 'a1', role: 'admin' }, target: { id: 'a1', status: 'active' }, action: 'lock', expected: 'reject' },
];

export function runAdminAccountActionRegressionSuite() {
  const results = CASES.map((testCase) => {
    try {
      const result = applyAdminAccountAction({
        actor: testCase.actor,
        targetUser: testCase.target,
        action: testCase.action,
        reason: 'security review',
      });
      const actual = result.user.status;
      return { name: testCase.name, expected: testCase.expected, actual, passed: actual === testCase.expected };
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
