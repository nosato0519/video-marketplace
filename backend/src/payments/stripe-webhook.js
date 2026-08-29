import Stripe from 'stripe';
import crypto from 'node:crypto';
import { validateWebhookPayload } from './webhook-payload.js';
import { recordPaymentEvent as defaultRecordPaymentEvent } from './payment-event-ledger.js';
import { completePayment as defaultCompletePayment } from './complete-payment.js';
import { failPayment as defaultFailPayment } from './fail-payment.js';

const STRIPE_EVENTS = new Map([
  ['checkout.session.completed', 'payment_succeeded'],
  ['checkout.session.async_payment_succeeded', 'payment_succeeded'],
  ['checkout.session.async_payment_failed', 'payment_failed'],
  ['payment_intent.payment_failed', 'payment_failed'],
]);

export function createStripeWebhookHandler({
  completePayment = defaultCompletePayment,
  failPayment = defaultFailPayment,
  recordPaymentEvent = defaultRecordPaymentEvent,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  stripe,
} = {}) {
  const verifier = stripe || new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_webhook_verifier');

  return async function handleStripeWebhook(req, res, next) {
    try {
      if (!secret) return res.status(503).json({ error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED' } });
      const signature = req.get('stripe-signature');
      const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '');
      let event;
      try {
        event = verifier.webhooks.constructEvent(rawBody, signature, secret);
      } catch {
        return res.status(401).json({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' } });
      }

      const eventType = STRIPE_EVENTS.get(event.type);
      if (!eventType) return res.status(200).json({ received: true, ignored: true });

      const payload = normalizeStripeEvent(event, eventType);
      validateWebhookPayload(payload);
      const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
      const recorded = await recordPaymentEvent({
        provider: 'stripe',
        eventId: payload.eventId,
        eventType: payload.eventType,
        providerPaymentId: payload.paymentId,
        payloadHash,
        orderId: payload.orderId,
      });
      if (recorded.duplicate) return res.status(200).json({ received: true, duplicate: true });

      const input = {
        eventId: payload.eventId,
        provider: 'stripe',
        providerPaymentId: payload.paymentId,
        orderId: payload.orderId,
        payloadHash,
      };
      if (eventType === 'payment_failed') {
        const result = await failPayment(input);
        return res.status(200).json({ received: true, result });
      }
      const result = await completePayment({
        ...input,
        payment: { ...payload, order_id: payload.orderId, provider_payment_id: payload.paymentId },
      });
      return res.status(200).json({ received: true, result });
    } catch (error) {
      next(error);
    }
  };
}

function normalizeStripeEvent(event, eventType) {
  const object = event?.data?.object || {};
  const metadata = object.metadata || {};
  const orderId = metadata.orderId || object.client_reference_id;
  const paymentId = metadata.paymentId || object.payment_intent || object.id;
  const amount = object.amount_total ?? object.amount_received ?? object.amount;
  const currency = object.currency;
  return {
    eventId: event.id,
    provider: 'stripe',
    eventType,
    paymentId: String(paymentId || ''),
    orderId: String(orderId || ''),
    amount: typeof amount === 'number' ? amount : Number(amount),
    currency: String(currency || '').toUpperCase(),
    status: eventType === 'payment_succeeded' ? 'succeeded' : 'failed',
  };
}
