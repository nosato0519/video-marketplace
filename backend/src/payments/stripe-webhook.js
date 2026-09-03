import Stripe from 'stripe';
import crypto from 'node:crypto';
import { validateWebhookPayload } from './webhook-payload.js';
import { fromStripeMinorUnits } from './stripe-money.js';
import { recordPaymentEvent as defaultRecordPaymentEvent } from './payment-event-ledger.js';
import { completePayment as defaultCompletePayment } from './complete-payment.js';
import { failPayment as defaultFailPayment } from './fail-payment.js';
import { refundPayment as defaultRefundPayment } from './refund-payment.js';

const STRIPE_EVENTS = new Map([
  ['checkout.session.completed', 'payment_succeeded'],
  ['checkout.session.async_payment_succeeded', 'payment_succeeded'],
  ['checkout.session.async_payment_failed', 'payment_failed'],
  ['payment_intent.payment_failed', 'payment_failed'],
  ['charge.refunded', 'payment_refunded'],
]);

export function createStripeWebhookHandler({
  completePayment = defaultCompletePayment,
  failPayment = defaultFailPayment,
  refundPayment = defaultRefundPayment,
  recordPaymentEvent = defaultRecordPaymentEvent,
  secret = process.env.STRIPE_WEBHOOK_SECRET,
  stripe,
} = {}) {
  const verifier = stripe || new Stripe(process.env.STRIPE_SECRET_KEY);

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

      const payload = await normalizeStripeEvent(event, eventType, verifier);
      if (eventType === 'payment_refunded' && !payload.fullRefund) {
        return res.status(200).json({ received: true, ignored: true, reason: 'partial_refund_not_supported' });
      }

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
      if (eventType === 'payment_refunded') {
        const result = await refundPayment(input);
        return res.status(200).json({ received: true, result });
      }
      const result = await completePayment({
        ...input,
        payment: { ...payload, order_id: payload.orderId, provider_payment_id: payload.paymentId },
      });
      return res.status(200).json({ received: true, result });
    } catch (error) {
      return next(error);
    }
  };
}

async function normalizeStripeEvent(event, eventType, stripe) {
  const object = event?.data?.object || {};
  if (eventType === 'payment_refunded') {
    const paymentIntentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
    const paymentIntent = paymentIntentId ? await stripe.paymentIntents.retrieve(paymentIntentId) : null;
    const orderId = object.metadata?.orderId || paymentIntent?.metadata?.orderId;
    const paymentId = paymentIntentId || object.id;
    const amount = paymentIntent?.amount_received ?? paymentIntent?.amount ?? object.amount;
    const refunded = object.amount_refunded ?? object.amount;
    return {
      eventId: event.id,
      eventType,
      paymentId,
      orderId,
      amount: fromStripeMinorUnits(amount, paymentIntent?.currency || object.currency),
      currency: String(paymentIntent?.currency || object.currency || '').toUpperCase(),
      fullRefund: Number(refunded) >= Number(amount),
    };
  }

  const paymentId = typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id;
  const orderId = object.client_reference_id || object.metadata?.orderId;
  const amountMinor = object.amount_total ?? object.amount_received ?? object.amount;
  return {
    eventId: event.id,
    eventType,
    paymentId,
    orderId,
    amount: fromStripeMinorUnits(amountMinor, object.currency),
    currency: String(object.currency || '').toUpperCase(),
  };
}
