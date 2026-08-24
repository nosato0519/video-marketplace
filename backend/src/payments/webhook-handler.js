import { isSuccessfulPaymentEvent, validatePaymentEvent } from './webhook-policy.js';
import { createEntitlementFromVerifiedPayment } from './entitlement-service.js';

export function handleVerifiedPaymentEvent({ event, order, product }) {
  const normalized = validatePaymentEvent(event);
  if (!order) throw new Error('order_not_found');
  if (String(order.provider_payment_id) !== normalized.providerPaymentId) {
    throw new Error('payment_reference_mismatch');
  }

  if (!isSuccessfulPaymentEvent(normalized.type)) {
    return { action: 'ignored', eventId: normalized.eventId };
  }

  if (order.status === 'paid') {
    return { action: 'already_processed', eventId: normalized.eventId, orderId: order.id };
  }

  if (order.status !== 'pending') throw new Error('order_not_payable');

  const entitlement = createEntitlementFromVerifiedPayment({
    order: { ...order, status: 'paid' },
    product,
  });

  return {
    action: 'complete',
    eventId: normalized.eventId,
    order: { ...order, status: 'paid' },
    entitlement,
  };
}
