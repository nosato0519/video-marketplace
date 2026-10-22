export function validateSuccessfulPaymentSettlement({ order, payment, provider }) {
  if (!order || !payment) throw new Error('payment_verification_input_required');

  // Payment verification accepts the public camelCase shape used by the
  // webhook/payment orchestration layer, while DB records use snake_case.
  const paymentOrderId = payment.order_id ?? payment.orderId;
  const providerPaymentId = payment.provider_payment_id ?? payment.providerPaymentId;

  const validId = (value) =>
    (typeof value === 'string' && value.trim() !== '') ||
    (typeof value === 'number' && Number.isSafeInteger(value));

  if (!validId(order.id) || !validId(paymentOrderId)) {
    throw new Error('payment_order_mismatch');
  }
  if (String(order.id) !== String(paymentOrderId)) throw new Error('payment_order_mismatch');
  if (order.provider && provider && order.provider !== provider) throw new Error('payment_provider_mismatch');
  if (payment.provider && provider && payment.provider !== provider) throw new Error('payment_provider_mismatch');
  if (order.status !== 'pending') throw new Error('order_not_settleable');
  if (payment.status !== 'succeeded') throw new Error('payment_not_succeeded');
  if (Number(payment.amount) !== Number(order.amount)) throw new Error('payment_amount_mismatch');
  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error('payment_currency_mismatch');
  }
  if (!providerPaymentId) throw new Error('provider_payment_id_required');
  return true;
}
