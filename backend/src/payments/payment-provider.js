import Stripe from 'stripe';
import { createHash } from 'node:crypto';
import { getPaymentProviderConfig } from './payment-provider-catalog.js';
import { toStripeMinorUnits } from './stripe-money.js';
import { paypalApiRequest, formatPayPalAmount } from './paypal-api.js';

export function createPaymentProvider({ provider = process.env.PAYMENT_PROVIDER } = {}) {
  const selected = provider || 'pending';
  if (selected === 'pending') return createPendingPaymentProvider();
  const config = getPaymentProviderConfig(selected);
  if (!config) throw new Error(`unsupported_payment_provider:${selected}`);
  if (selected === 'stripe') return createStripeProvider();
  if (selected === 'paypal') return createPayPalProvider();
  return createUnavailableProvider(config);
}

function createPendingPaymentProvider() {
  return { name: 'pending', configured: false, async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
    validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey });
    return { provider: 'pending', reference: metadata?.orderId ?? orderId, orderId, amount, currency, idempotencyKey, status: 'not_configured' };
  }};
}

function createUnavailableProvider(config) {
  return { name: config.id, configured: false, regions: config.regions, async createCheckout() { throw new Error(`payment_provider_adapter_not_implemented:${config.id}`); } };
}

function createPayPalProvider() {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
  const successUrl = process.env.PAYPAL_SUCCESS_URL;
  const cancelUrl = process.env.PAYPAL_CANCEL_URL;
  if (!clientId || !clientSecret || !webhookId) {
    throw new Error('payment_provider_not_configured:paypal');
  }
  if (!successUrl || !cancelUrl) throw new Error('stripe_redirect_urls_not_configured');
  validateStripeRedirectUrls(successUrl, cancelUrl);
  return {
    name: 'paypal',
    configured: true,
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey });
      const normalizedCurrency = String(currency).toUpperCase();
      const value = formatPayPalAmount(amount, normalizedCurrency);
      const requestId = createPayPalRequestId(idempotencyKey);
      const order = await paypalApiRequest('/v2/checkout/orders', {
        method: 'POST',
        requestId,
        body: {
          intent: 'CAPTURE',
          purchase_units: [{
            reference_id: String(orderId),
            custom_id: String(orderId),
            invoice_id: String(metadata.paymentId),
            description: 'Video Marketplace purchase',
            amount: { currency_code: normalizedCurrency, value },
          }],
          application_context: {
            brand_name: 'Video Marketplace',
            user_action: 'PAY_NOW',
            return_url: successUrl,
            cancel_url: cancelUrl,
          },
        },
      });
      const approval = order.links?.find((link) => ['approve', 'payer-action'].includes(link.rel));
      if (!order.id || !approval?.href) throw new Error('paypal_checkout_response_invalid');
      return {
        provider: 'paypal',
        orderId,
        amount,
        currency: normalizedCurrency,
        idempotencyKey,
        paymentId: metadata.paymentId,
        sessionId: order.id,
        url: approval.href,
        status: order.status || 'CREATED',
      };
    },
  };
}

function createPayPalRequestId(idempotencyKey) {
  return createHash('sha256').update(String(idempotencyKey)).digest('hex').slice(0, 32);
}

function createStripeProvider() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || !process.env.STRIPE_WEBHOOK_SECRET) throw new Error('payment_provider_not_configured:stripe');
  const successUrl = process.env.STRIPE_SUCCESS_URL;
  const cancelUrl = process.env.STRIPE_CANCEL_URL;
  if (!successUrl || !cancelUrl) throw new Error('stripe_redirect_urls_not_configured');
  validateStripeRedirectUrls(successUrl, cancelUrl);
  const stripe = new Stripe(secretKey);
  return {
    name: 'stripe', configured: true,
    async createCheckout({ orderId, amount, currency, metadata, idempotencyKey }) {
      validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey });
      const normalizedCurrency = String(currency).toUpperCase();
      const unitAmount = toStripeMinorUnits(amount, normalizedCurrency);
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', client_reference_id: String(orderId),
        line_items: [{ price_data: { currency: normalizedCurrency.toLowerCase(), product_data: { name: 'Video Marketplace purchase' }, unit_amount: unitAmount }, quantity: 1 }],
        metadata: { orderId: String(orderId), paymentId: String(metadata.paymentId), ...(metadata.reference ? { reference: String(metadata.reference) } : {}) },
        payment_intent_data: {
          metadata: { orderId: String(orderId), paymentId: String(metadata.paymentId) },
        },
        success_url: withStripeSessionId(successUrl, orderId), cancel_url: cancelUrl,
      }, { idempotencyKey });
      if (!session.id || !session.url) throw new Error('stripe_checkout_response_invalid');
      return { provider: 'stripe', orderId, amount, currency: normalizedCurrency, idempotencyKey, paymentId: metadata.paymentId, sessionId: session.id, url: session.url, status: session.status };
    },
  };
}

function validateStripeRedirectUrls(successUrl, cancelUrl) {
  let success;
  let cancel;
  try {
    success = new URL(successUrl);
    cancel = new URL(cancelUrl);
  } catch {
    throw new Error('stripe_redirect_url_invalid');
  }
  for (const url of [success, cancel]) {
    if (url.protocol !== 'https:' || url.username || url.password) {
      throw new Error('stripe_redirect_url_must_be_https');
    }
  }
  if (success.searchParams.has('orderId') || success.searchParams.has('session_id')) {
    throw new Error('stripe_success_url_must_not_include_checkout_parameters');
  }
}

function validateCheckoutInput({ orderId, amount, currency, metadata, idempotencyKey }) {
  if (
    (typeof orderId !== 'string' && typeof orderId !== 'number') ||
    !String(orderId).trim() ||
    String(orderId).length > 255 ||
    (typeof orderId === 'number' && !Number.isSafeInteger(orderId))
  ) {
    throw new Error('checkout_order_id_required');
  }
  if (
    (typeof amount !== 'string' && typeof amount !== 'number') ||
    (typeof amount === 'string' && !amount.trim()) ||
    !Number.isFinite(Number(amount)) ||
    Number(amount) <= 0
  ) {
    throw new Error('checkout_amount_invalid');
  }
  if (typeof currency !== 'string' || !/^[A-Za-z]{3}$/.test(currency)) {
    throw new Error('checkout_currency_invalid');
  }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) throw new Error('checkout_metadata_required');
  if (metadata.orderId !== undefined && String(metadata.orderId) !== String(orderId)) throw new Error('checkout_order_mismatch');
  if (String(metadata.paymentId ?? '').length > 500) throw new Error('checkout_payment_id_required');
  if (
    metadata.reference !== undefined &&
    metadata.reference !== null &&
    ((typeof metadata.reference !== 'string' && typeof metadata.reference !== 'number') ||
      !String(metadata.reference).trim() ||
      String(metadata.reference).length > 500)
  ) {
    throw new Error('checkout_reference_invalid');
  }
  if (typeof idempotencyKey !== 'string' || !idempotencyKey.trim()) throw new Error('checkout_idempotency_key_required');
  if (idempotencyKey.length > 255) throw new Error('checkout_idempotency_key_invalid');
  if (
    (typeof metadata.paymentId !== 'string' && typeof metadata.paymentId !== 'number') ||
    !String(metadata.paymentId).trim() ||
    (typeof metadata.paymentId === 'number' && !Number.isSafeInteger(metadata.paymentId))
  ) {
    throw new Error('checkout_payment_id_required');
  }
}

function withStripeSessionId(url, orderId) {
  const value = String(url);
  const hashIndex = value.indexOf('#');
  const base = hashIndex === -1 ? value : value.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : value.slice(hashIndex);
  const params = [];
  if (!/[?&]orderId=/.test(base)) params.push('orderId=' + encodeURIComponent(String(orderId)));
  if (!/[?&]session_id=/.test(base) && !base.includes('{CHECKOUT_SESSION_ID}')) {
    params.push('session_id={CHECKOUT_SESSION_ID}');
  }
  if (!params.length) return value;
  const separator = base.includes('?') ? (/[?&]$/.test(base) ? '' : '&') : '?';
  return base + separator + params.join('&') + hash;
}
