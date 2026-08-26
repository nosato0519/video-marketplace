import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATES, canTransitionOrder } from './order-state.js';

test('allows pending orders to become paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PENDING, ORDER_STATES.PAID), true);
});

test('allows pending orders to be cancelled', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PENDING, ORDER_STATES.CANCELLED), true);
});

test('allows paid orders to be refunded', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PAID, ORDER_STATES.REFUNDED), true);
});

test('rejects paid to pending', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.PAID, ORDER_STATES.PENDING), false);
});

test('rejects cancelled to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.CANCELLED, ORDER_STATES.PAID), false);
});

test('rejects refunded to paid', () => {
  assert.equal(canTransitionOrder(ORDER_STATES.REFUNDED, ORDER_STATES.PAID), false);
});

test('rejects unknown states', () => {
  assert.equal(canTransitionOrder('unknown', ORDER_STATES.PAID), false);
  assert.equal(canTransitionOrder(ORDER_STATES.PENDING, 'unknown'), false);
});
