import Stripe from 'stripe';
import { getPaymentProviderConfig } from './payment-provider-catalog.js';

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
]);

export function createPaymentProvider({ provider = process.env.PAYMENT_PROVIDER } = {}) {
  const selected = provider || 'pending';
  if (selected === 'pending') return createPendingPaymentProvider();

  const config = getPaymentProviderConfig(selected);
  if (!config) throw new Error(`unsupported_payment_provider:${selected}`);
  if (selected === 'stripe') return createStripeProvider();

  return createUnavailableProvider(config);
}

function createPendingPaymentProvider() {
  return {
    name: 'pending',
    configured: false,
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey });
      return {
        provider: 'pending', reference: metadata?.orderId ?? orderId, orderId, amount, currency, idempotencyKey,
        status: 'not_configured',
      };
    },
  };
}

function createUnavailableProvider(config) {
  return {
    name: config.id,
    configured: false,
    regions: config.regions,
    async createCheckout() {
      throw new Error(`payment_provider_adapter_not_implemented:${config.id}`);
    },
  };
}

function createStripeProvider() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) throw new Error('payment_provider_not_configured');

  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) throw new Error('stripe_redirect_urls_not_configured');

  const stripe = new Stripe(secretKey);

  return {
    name: 'stripe',
    configured: true,
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey });
      const normalizedCurrency = String(currency).toUpperCase();
      const unitAmount = toMinorUnits(amount, normalizedCurrency);

      const session = await stripe.checkout.sessions.create(
        {
          mode: 'payment',
          client_reference_id: orderId,
          line_items: [{
            price_data: {
              currency: normalizedCurrency.toLowerCase(),
              product_data: { name: 'Video Marketplace purchase' },
              unit_amount: unitAmount,
            },
            quantity: 1,
          }],
          metadata: {
            orderId,
            paymentId: String(metadata.paymentId),
            ...(metadata.reference ? { reference: String(metadata.reference) } : {}),
          },
          success_url: withStripeSessionId(successUrl),
          cancel_url: cancelUrl,
        },
        { idempotencyKey }
      );

      if (!session.id || !session.url) throw new Error('stripe_checkout_response_invalid');
      return {
        provider: 'stripe', orderId, amount, currency: normalizedCurrency, idempotencyKey,
        paymentId: metadata.paymentId, sessionId: session.id, url: session.url, status: session.status,
      };
    },
  };
}

function withStripeSessionId(url) {
  const value = String(url);
  if (value.includes('{CHECKOUT_SESSION_ID}')) return value;
  const separator = value.includes('?') ? '&' : '?';
  return `${value}${separator}session_id={CHECKOUT_SESSION_ID}`;
}

function validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey }) {
  if (!orderId) throw new Error('order_required');
  if (!idempotencyKey) throw new Error('checkout_idempotency_key_required');
  if (metadata?.orderId !== orderId) throw new Error('checkout_order_mismatch');
  if (!metadata?.paymentId) throw new Error('checkout_payment_id_required');
  if (!/^[A-Z]{3}$/i.test(String(currency))) throw new Error('checkout_currency_invalid');
  toMinorUnits(amount, String(currency).toUpperCase());
}

function toMinorUnits(amount, currency) {
  const value = String(amount).trim();
  const exponent = ZERO_DECIMAL_CURRENCIES.has(currency) ? 0 : 2;
  const pattern = exponent === 0 ? /^(\d+)$/ : /^(\d+)(?:\.(\d{1,2}))?$/;
  const match = value.match(pattern);
  if (!match) throw new Error('checkout_amount_invalid');

  const whole = BigInt(match[1]);
  const fraction = exponent === 0 ? 0n : BigInt((match[2] ?? '').padEnd(2, '0'));
  const minor = whole * (10n ** BigInt(exponent)) + fraction;
  if (minor <= 0n || minor > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('checkout_amount_invalid');
  return Number(minor);
}
