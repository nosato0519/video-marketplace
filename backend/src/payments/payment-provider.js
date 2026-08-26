export function createPaymentProvider({ provider = process.env.PAYMENT_PROVIDER } = {}) {
  if (!provider || provider === 'pending') {
    return createPendingPaymentProvider();
  }

  throw new Error(`unsupported_payment_provider:${provider}`);
}

function createPendingPaymentProvider() {
  return {
    name: 'pending',
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      if (!orderId) throw new Error('order_required');
      if (!idempotencyKey) throw new Error('checkout_idempotency_key_required');
      if (metadata?.orderId !== orderId) throw new Error('checkout_order_mismatch');

      return {
        provider: 'pending',
        reference: metadata?.orderId ?? orderId,
        orderId,
        amount,
        currency,
        idempotencyKey,
        status: 'not_configured',
      };
    },
  };
}
