export function verifyPaymentAgainstOrder({
  payment,
  order,
}) {
  if (!payment || !order) throw new Error('payment_verification_input_required');
  if (typeof order.id !== 'string' || order.id.trim() === '' || typeof payment.orderId !== 'string' || payment.orderId.trim() === '') {
    throw new Error('payment_order_id_required');
  }
  if (typeof order.currency !== 'string' || !/^[A-Za-z]{3}$/.test(order.currency) || typeof payment.currency !== 'string' || !/^[A-Za-z]{3}$/.test(payment.currency)) {
    throw new Error('payment_currency_invalid');
  }

  if (payment.orderId !== order.id) {
    throw new Error('payment_order_mismatch');
  }

  if (String(payment.currency).toUpperCase() !== String(order.currency).toUpperCase()) {
    throw new Error('payment_currency_mismatch');
  }

  const paidAmount = Number(payment.amount);
  const orderAmount = Number(order.amount);

  if (!Number.isFinite(paidAmount) || !Number.isFinite(orderAmount)) {
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
