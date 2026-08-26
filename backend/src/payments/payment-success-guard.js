export function validateSuccessfulPaymentSettlement({ order, payment }) {
  if (!order || !payment) throw new Error('payment_verification_input_required');
  if (order.id !== payment.order_id) throw new Error('payment_order_mismatch');
  if (order.status !== 'pending') throw new Error('order_not_settleable');
  if (payment.status !== 'succeeded') throw new Error('payment_not_succeeded');
  if (Number(payment.amount) !== Number(order.amount)) throw new Error('payment_amount_mismatch');
  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error('payment_currency_mismatch');
  }
  if (!payment.provider_payment_id) throw new Error('provider_payment_id_required');
  return true;
}
