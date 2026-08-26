const SUPPORTED_PROVIDERS = new Set(['pending', 'stripe']);

export function createPaymentProvider({ provider = process.env.PAYMENT_PROVIDER } = {}) {
  const selected = provider || 'pending';
  if (!SUPPORTED_PROVIDERS.has(selected)) {
    throw new Error(`unsupported_payment_provider:${selected}`);
  }

  if (selected === 'stripe') return createStripeProvider();
  return createPendingPaymentProvider();
}

function createPendingPaymentProvider() {
  return {
    name: 'pending',
    configured: false,
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

function createStripeProvider() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('payment_provider_not_configured');

  return {
    name: 'stripe',
    configured: true,
    async createCheckout() {
      throw new Error('stripe_provider_adapter_not_implemented');
    },
  };
}
