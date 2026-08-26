const ALLOWED_EVENTS = new Set(['security_report.created', 'account.status_changed', 'evidence.accessed']);

export function validateWebhookEvent({ event }) {
  if (!event?.type || !ALLOWED_EVENTS.has(event.type)) throw new Error('unsupported_webhook_event');
  if (!event.id || !event.createdAt) throw new Error('invalid_webhook_event');
  return {
    id: event.id,
    type: event.type,
    payload: event.payload ?? {},
    createdAt: event.createdAt,
  };
}

export function buildWebhookDelivery({ event, destination, now = new Date() }) {
  validateWebhookEvent({ event });
  if (typeof destination !== 'string' || !destination.startsWith('https://')) throw new Error('invalid_webhook_destination');
  return {
    eventId: event.id,
    eventType: event.type,
    destination,
    status: 'pending',
    createdAt: now.toISOString(),
  };
}
