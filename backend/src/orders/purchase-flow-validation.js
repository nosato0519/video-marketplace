import { ORDER_STATES, canTransitionOrder } from './order-state.js';

export function validatePurchaseFlowResult({ order, checkout }) {
  if (!order) throw new Error('order_required');
  if (order.status !== ORDER_STATES.PENDING) throw new Error('order_not_pending');
  if (!checkout) throw new Error('checkout_session_missing');
  return true;
}

export function validateRefundTransition({ status }) {
  if (!canTransitionOrder(status, ORDER_STATES.REFUNDED)) {
    throw new Error('order_not_refundable');
  }
  return true;
}
