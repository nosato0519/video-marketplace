import { ORDER_STATES } from './order-state.js';

const VALID_ORDER_STATES = new Set(Object.values(ORDER_STATES));

export function assertValidOrderState(status) {
  if (!VALID_ORDER_STATES.has(status)) {
    throw new Error(`invalid_order_state:${status}`);
  }
  return true;
}
