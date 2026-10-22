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
  'stripe_amount_invalid',
  'stripe_amount_precision_invalid',
  'invalid_payment_event',
  'payment_webhook_event_required',
  'payment_webhook_metadata_missing',
  'payment_event_payload_mismatch',
  'payment_order_mismatch',
  'payment_order_id_required',
  'payment_currency_invalid',
  'payment_currency_mismatch',
  'payment_amount_invalid',
  'payment_amount_mismatch',
  'payment_not_succeeded',
  'payment_provider_mismatch',
  'payment_provider_or_id_mismatch',
  'provider_payment_id_mismatch',
  'payment_not_settleable',
  'payment_not_refundable',
  'payment_event_not_found',
  'order_not_found',
  'order_not_payable',
  'order_not_refundable',
  'order_not_cancellable',
  'payment_record_not_found',
  'payment_not_found',
  'payment_order_mismatch',
  'payment_verification_input_required',
  'payment_settlement_identifiers_required',
  'payment_order_not_settleable',
  'provider_payment_id_required',
  'paid_order_required',
  'order_not_settleable',
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
