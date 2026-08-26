import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionOrder, ORDER_STATES } from '../orders/order-state.js';

test('payment completion permits pending to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PENDING, ORDER_STATES.PAID), true);
});

test('payment completion rejects cancelled to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.CANCELLED, ORDER_STATES.PAID), false);
});

test('payment completion rejects refunded to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.REFUNDED, ORDER_STATES.PAID), false);
});

test('payment completion rejects paid to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PAID, ORDER_STATES.PAID), false);
});
