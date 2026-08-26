import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrder, ORDER_STATES } from '../orders/order-state.js';

test('refund flow permits paid to refunded', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PAID, ORDER_STATES.REFUNDED), true);
});

test('refund flow rejects pending to refunded', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PENDING, ORDER_STATES.REFUNDED), false);
});

test('refund flow rejects cancelled to refunded', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.CANCELLED, ORDER_STATES.REFUNDED), false);
});

test('refund flow rejects refunded to refunded', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.REFUNDED, ORDER_STATES.REFUNDED), false);
});
