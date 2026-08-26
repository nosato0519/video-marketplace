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
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      if (!orderId) throw new Error('order_required');
      if (!idempotencyKey) throw new Error('checkout_idempotency_key_required');
      if (metadata?.orderId !== orderId) throw new Error('checkout_order_mismatch');
      if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) throw new Error('checkout_amount_invalid');
      if (!/^[A-Z]{3}$/i.test(String(currency))) throw new Error('checkout_currency_invalid');
      if (!metadata?.paymentId) throw new Error('checkout_payment_id_required');

      // Adapter boundary: the Stripe SDK/API call will be implemented behind this
      // interface. No card/payment data is accepted or persisted here.
      return {
        provider: 'stripe',
        orderId,
        amount,
        currency: String(currency).toUpperCase(),
        idempotencyKey,
        metadata: { ...metadata },
        status: 'adapter_pending',
      };
    },
  };
}
