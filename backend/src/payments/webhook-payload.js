const EVENT_TYPES = new Set(['payment_succeeded', 'payment_failed', 'payment_refunded']);

export function validateWebhookPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('invalid_webhook_payload');
  }

  const requiredStrings = ['eventId', 'provider', 'eventType', 'paymentId', 'orderId'];
  for (const key of requiredStrings) {
    if (typeof payload[key] !== 'string' || payload[key].trim() === '') {
      throw new Error(`invalid_webhook_${key}`);
    }
  }

  if (!EVENT_TYPES.has(payload.eventType)) {
    throw new Error('unsupported_webhook_event_type');
  }

  if (payload.eventType === 'payment_succeeded') {
    if (typeof payload.amount !== 'number' || !Number.isFinite(payload.amount) || payload.amount < 0) {
      throw new Error('invalid_webhook_amount');
    }
    if (typeof payload.currency !== 'string' || !/^[A-Za-z]{3}$/.test(payload.currency)) {
      throw new Error('invalid_webhook_currency');
    }
    if (payload.status !== 'succeeded') {
      throw new Error('invalid_webhook_status');
    }
  }

  return payload;
}
