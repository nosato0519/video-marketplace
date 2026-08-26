import test from 'node:test';
import assert from 'node:assert/strict';
import { ORDER_STATES } from './order-state.js';
import { validatePurchaseFlowResult, validateRefundTransition } from './purchase-flow-validation.js';

test('accepts a pending order with a checkout session', () => {
  assert.equal(
    validatePurchaseFlowResult({ order: { status: ORDER_STATES.PENDING }, checkout: { id: 'checkout-1' } }),
    true
  );
});

test('rejects a non-pending order before checkout', () => {
  assert.throws(
    () => validatePurchaseFlowResult({ order: { status: ORDER_STATES.PAID }, checkout: { id: 'checkout-1' } }),
    /order_not_pending/
  );
});

test('rejects a missing checkout session', () => {
  assert.throws(
    () => validatePurchaseFlowResult({ order: { status: ORDER_STATES.PENDING }, checkout: null }),
    /checkout_session_missing/
  );
});

test('allows refunds only from paid orders', () => {
  assert.equal(validateRefundTransition({ status: ORDER_STATES.PAID }), true);
});

test('rejects refunds from pending orders', () => {
  assert.throws(
    () => validateRefundTransition({ status: ORDER_STATES.PENDING }),
    /order_not_refundable/
  );
});
