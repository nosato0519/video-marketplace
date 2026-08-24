const RETRYABLE = new Set(['failed']);

export function shouldRetryPaymentEvent(event) {
  return Boolean(event && RETRYABLE.has(event.status));
}

export function buildPaymentEventRetry({ event, now = new Date() }) {
  if (!shouldRetryPaymentEvent(event)) throw new Error('event_not_retryable');
  return {
    eventId: event.id,
    retryRequestedAt: now.toISOString(),
    status: 'received',
  };
}

export function assertSafeRetry({ event, order }) {
  if (!event || !order) throw new Error('retry_context_missing');
  if (event.order_id && event.order_id !== order.id) throw new Error('order_reference_mismatch');
  if (order.status === 'refunded' || order.status === 'cancelled') throw new Error('order_not_retryable');
  return true;
}
