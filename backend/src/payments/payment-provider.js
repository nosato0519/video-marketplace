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
