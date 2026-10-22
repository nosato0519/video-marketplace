const RETRYABLE = new Set(['failed']);

export function shouldRetryPaymentEvent(event) {
  return Boolean(event && RETRYABLE.has(event.status));
}

export function buildPaymentEventRetry({ event, now = new Date() }) {
  if (!shouldRetryPaymentEvent(event)) throw new Error('event_not_retryable');
  const validId =
    (typeof event.id === 'string' && event.id.trim() !== '') ||
    (typeof event.id === 'number' && Number.isSafeInteger(event.id) && event.id > 0);
  if (!validId) throw new Error('payment_event_id_required');
  return {
    eventId: String(event.id),
    retryRequestedAt: now.toISOString(),
    status: 'received',
  };
}

export function assertSafeRetry({ event, order }) {
  if (!event || !order) throw new Error('retry_context_missing');

  const eventOrderId = event.order_id;
  const orderId = order.id;
  if (
    eventOrderId === null ||
    eventOrderId === undefined ||
    orderId === null ||
    orderId === undefined ||
    !String(eventOrderId).trim() ||
    !String(orderId).trim() ||
    String(eventOrderId) !== String(orderId)
  ) {
    throw new Error('order_reference_mismatch');
  }

  if (order.status !== 'pending') throw new Error('order_not_retryable');
  return true;
}
