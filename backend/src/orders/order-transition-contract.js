import { ORDER_STATES, canTransitionOrder } from './order-state.js';

export const ORDER_TRANSITION_CONTRACT = Object.freeze([
  [ORDER_STATES.PENDING, ORDER_STATES.PAID],
  [ORDER_STATES.PENDING, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PAID, ORDER_STATES.REFUNDED],
]);

export function assertValidOrderTransition(from, to) {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`invalid_order_transition:${from}->${to}`);
  }
  return true;
}
