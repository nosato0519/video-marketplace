import Stripe from 'stripe';
import { settlePaymentWebhook } from './payment-webhook-settlement.js';

export function createStripeSettlementHandler({
  secretKey = process.env.STRIPE_SECRET_KEY,
  webhookSecret = process.env.STRIPE_WEBHOOK_SECRET,
} = {}) {
  if (!secretKey) throw new Error('payment_provider_not_configured');
  if (!webhookSecret) throw new Error('stripe_webhook_secret_not_configured');

  const stripe = new Stripe(secretKey);

  return async function handleStripeSettlement({ rawBody, signature } = {}) {
    if (!rawBody) throw new Error('stripe_webhook_body_required');
    if (!signature) throw new Error('stripe_webhook_signature_required');

    const event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    return settlePaymentWebhook({ event });
  };
}
