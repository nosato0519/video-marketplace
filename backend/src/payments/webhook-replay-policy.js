export function validateWebhookReplay({ recordedEvent, incoming }) {
  if (!recordedEvent || !incoming) throw new Error('webhook_replay_input_required');

  const same =
    recordedEvent.provider === incoming.provider &&
    recordedEvent.event_id === incoming.eventId &&
    recordedEvent.event_type === incoming.eventType &&
    recordedEvent.provider_payment_id === incoming.paymentId &&
    (recordedEvent.order_id ?? null) === (incoming.orderId ?? null);

  if (!same) throw new Error('payment_event_payload_mismatch');

  return recordedEvent.status === 'processed' ? 'already_processed' : 'recorded';
}
