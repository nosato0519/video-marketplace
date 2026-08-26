const PUBLIC_WEBHOOK_ERRORS = new Set([
  'invalid_webhook_payload',
  'invalid_webhook_eventId',
  'invalid_webhook_provider',
  'invalid_webhook_eventType',
  'invalid_webhook_paymentId',
  'invalid_webhook_orderId',
  'unsupported_webhook_event_type',
  'invalid_webhook_amount',
  'invalid_webhook_currency',
  'invalid_webhook_status',
  'payment_event_payload_mismatch',
  'payment_order_mismatch',
  'payment_currency_mismatch',
  'payment_amount_invalid',
  'payment_amount_mismatch',
  'payment_not_succeeded',
  'payment_event_not_found',
  'order_not_found',
  'order_not_payable',
]);

export function toWebhookErrorResponse(error) {
  // Malformed JSON is a client-side webhook error, not an internal failure.
  if (error instanceof SyntaxError) {
    return {
      status: 400,
      body: { error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' } },
    };
  }

  if (!PUBLIC_WEBHOOK_ERRORS.has(error?.message)) {
    return {
      status: 500,
      body: { error: { code: 'WEBHOOK_PROCESSING_FAILED', message: 'Webhook processing failed' } },
    };
  }

  return {
    status: 400,
    body: { error: { code: 'INVALID_WEBHOOK', message: 'Webhook validation failed' } },
  };
}
