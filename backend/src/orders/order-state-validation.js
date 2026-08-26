import { ORDER_STATES } from './order-state.js';

const VALID_ORDER_STATES = new Set(Object.values(ORDER_STATES));

export function assertValidOrderState(status) {
  if (!VALID_ORDER_STATES.has(status)) {
    throw new Error(`invalid_order_state:${status}`);
  }
  return true;
}

export function assertValidOrderRecord(order) {
  if (!order) throw new Error('order_required');
  assertValidOrderState(order.status);

  if (!order.id) throw new Error('order_id_required');
  if (!order.buyer_id) throw new Error('order_buyer_required');
  if (!order.product_id) throw new Error('order_product_required');

  const amount = Number(order.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('invalid_order_amount');
  }

  if (!/^[A-Z]{3}$/.test(order.currency)) {
    throw new Error('invalid_order_currency');
  }

  return true;
}
