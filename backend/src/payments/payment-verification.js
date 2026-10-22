export function verifyPaymentAgainstOrder({
  payment,
  order,
}) {
  if (!payment || !order) throw new Error('payment_verification_input_required');
  const validId = (value) =>
    (typeof value === 'string' || typeof value === 'number') &&
    String(value).trim() !== '' &&
    (typeof value !== 'number' || Number.isSafeInteger(value));

  if (!validId(order.id) || !validId(payment.orderId)) {
    throw new Error('payment_order_id_required');
  }
  if (typeof order.currency !== 'string' || !/^[A-Za-z]{3}$/.test(order.currency) || typeof payment.currency !== 'string' || !/^[A-Za-z]{3}$/.test(payment.currency)) {
    throw new Error('payment_currency_invalid');
  }

  if (String(payment.orderId) !== String(order.id)) {
    throw new Error('payment_order_mismatch');
  }

  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error('payment_currency_mismatch');
  }

  const isValidAmount = (value) =>
    (typeof value === 'number' && Number.isFinite(value)) ||
    (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)));
  if (!isValidAmount(payment.amount) || !isValidAmount(order.amount)) {
    throw new Error('payment_amount_invalid');
  }

  const paidAmount = Number(payment.amount);
  const orderAmount = Number(order.amount);

  if (paidAmount <= 0 || orderAmount <= 0) {
    throw new Error('payment_amount_invalid');
  }

  if (paidAmount !== orderAmount) {
    throw new Error('payment_amount_mismatch');
  }

  if (payment.status !== 'succeeded') {
    throw new Error('payment_not_succeeded');
  }

  return true;
}
