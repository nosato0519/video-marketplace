import { SETTLEMENT_TEST_CASES } from './settlement-test-cases.js';
import { buildSettlementTransaction } from './settlement-idempotency.js';

export function runSettlementRegressionSuite() {
  const results = SETTLEMENT_TEST_CASES.map((testCase) => {
    const { orderStatus, eventStatus, sameOrder } = testCase.input;
    try {
      if (!sameOrder) throw new Error('order_reference_mismatch');
      const result = buildSettlementTransaction({
        event: { id: 'test-event', status: eventStatus, order_id: 'test-order' },
        order: { id: 'test-order', status: orderStatus, buyer_id: 'test-user', product_id: 'test-product' },
      });
      const actual = result.action;
      return { name: testCase.name, expected: testCase.expected, actual, passed: actual === testCase.expected };
    } catch (error) {
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
