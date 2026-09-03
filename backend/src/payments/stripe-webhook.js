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
      next(error);
    }
  };
}

async function normalizeStripeEvent(event, eventType, stripe) {
  const object = event?.data?.object || {};
  const metadata = object.metadata || {};
  const paymentId = metadata.paymentId || object.payment_intent || object.id;
  let orderId = metadata.orderId || object.client_reference_id;

  if (eventType === 'payment_refunded' && object.payment_intent) {
    if (!object.refunded) {
      return {
        eventId: event.id,
        provider: 'stripe',
        eventType,
        paymentId: String(paymentId || ''),
        orderId: String(orderId || ''),
        amount: 0,
        currency: String(object.currency || '').toUpperCase(),
        status: 'failed',
        fullRefund: false,
      };
    }

    if (!orderId) {
      const paymentIntent = await stripe.paymentIntents.retrieve(String(object.payment_intent));
      orderId = paymentIntent?.metadata?.orderId || paymentIntent?.client_reference_id;
    }
  }

  const currency = String(object.currency || '').toUpperCase();
  const amountMinor = eventType === 'payment_refunded'
    ? object.amount
    : object.amount_total ?? object.amount_received ?? object.amount;
  const amount = typeof amountMinor === 'number' ? amountMinor : Number(amountMinor);
  return {
    eventId: event.id,
    provider: 'stripe',
    eventType,
    paymentId: String(paymentId || ''),
    orderId: String(orderId || ''),
    amount: fromStripeMinorUnits(amount, currency),
    currency,
    status: eventType === 'payment_succeeded' ? 'succeeded' : 'failed',
    fullRefund: eventType !== 'payment_refunded' || object.refunded === true,
  };
}
