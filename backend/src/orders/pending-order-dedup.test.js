import test from 'node:test';
import assert from 'node:assert/strict';
import { isPendingOrderUniqueViolation } from './pending-order-dedup.js';

test('recognizes the pending-order uniqueness violation', () => {
  assert.equal(
    isPendingOrderUniqueViolation({ code: '23505', constraint: 'orders_pending_buyer_product_idx' }),
    true
  );
});

test('does not classify unrelated unique violations as pending-order duplicates', () => {
  assert.equal(
    isPendingOrderUniqueViolation({ code: '23505', constraint: 'orders_provider_payment_id_idx' }),
    false
  );
});

test('does not classify non-unique database errors as pending-order duplicates', () => {
  assert.equal(
    isPendingOrderUniqueViolation({ code: '23503', constraint: 'orders_pending_buyer_product_idx' }),
    false
  );
});
