export const SETTLEMENT_TEST_CASES = Object.freeze([
  { name: 'normal payment', input: { orderStatus: 'pending', eventStatus: 'received', sameOrder: true }, expected: 'commit' },
  { name: 'duplicate processed event', input: { orderStatus: 'pending', eventStatus: 'processed', sameOrder: true }, expected: 'already_processed' },
  { name: 'already paid order', input: { orderStatus: 'paid', eventStatus: 'received', sameOrder: true }, expected: 'already_settled' },
  { name: 'cancelled order', input: { orderStatus: 'cancelled', eventStatus: 'received', sameOrder: true }, expected: 'reject' },
  { name: 'event references another order', input: { orderStatus: 'pending', eventStatus: 'received', sameOrder: false }, expected: 'reject' },
]);

export function assertSettlementCaseResult({ actual, expected }) {
  if (actual !== expected) throw new Error(`settlement_test_failed:${expected}:${actual}`);
  return true;
}
