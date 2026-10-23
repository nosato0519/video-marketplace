import Stripe from 'stripe';
import crypto from 'node:crypto';
import { validateWebhookPayload } from './webhook-payload.js';
import { fromStripeMinorUnits } from './stripe-money.js';
import { recordPaymentEvent as defaultRecordPaymentEvent } from './payment-event-ledger.js';
import { completePayment as defaultCompletePayment } from './complete-payment.js';
import { failPayment as defaultFailPayment } from './fail-payment.js';
import { refundPayment as defaultRefundPayment } from './refund-payment.js';
import { toWebhookErrorResponse } from './webhook-error.js';

const STRIPE_EVENTS = new Map([
  ['checkout.session.completed', 'payment_succeeded'],
  ['checkout.session.async_payment_succeeded', 'payment_succeeded'],
  ['checkout.session.async_payment_failed', 'payment_failed'],
  ['checkout.session.expired', 'payment_failed'],
  ['payment_intent.succeeded', 'payment_succeeded'],
  ['payment_intent.payment_failed', 'payment_failed'],
  ['payment_intent.canceled', 'payment_failed'],
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
  return async function handleStripeWebhook(req, res, next) {
    try {
      if (!secret || (!stripe && !process.env.STRIPE_SECRET_KEY)) {
        return res.status(503).json({ error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'Stripe webhook configuration is incomplete' } });
      }
      const verifier = stripe || new Stripe(process.env.STRIPE_SECRET_KEY);
      const signature = req.get('stripe-signature');
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_BODY', message: 'Webhook body must be raw JSON bytes' } });
      }
      const rawBody = req.body;
      let event;
      try {
        event = verifier.webhooks.constructEvent(rawBody, signature, secret);
      } catch {
        return res.status(401).json({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' } });
      }

      const eventType = STRIPE_EVENTS.get(event.type);
      if (!eventType) return res.status(200).json({ received: true, ignored: true });
      if (event.type === 'checkout.session.expired' && !event.data?.object?.payment_intent) {
        return res.status(200).json({ received: true, ignored: true, reason: 'expired_session_without_payment_intent' });
      }
      if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type) && event.data?.object?.payment_status !== 'paid') {
        return res.status(200).json({ received: true, ignored: true, reason: 'payment_not_paid' });
      }

      const payload = await normalizeStripeEvent(event, eventType, verifier);

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
      if (recorded.duplicate && recorded.event?.status === 'processed') {
        return res.status(200).json({ received: true, duplicate: true });
      }

      const input = {
        eventId: payload.eventId,
        provider: 'stripe',
        providerPaymentId: payload.paymentId,
        checkoutSessionId: payload.checkoutSessionId,
        orderId: payload.orderId,
        payloadHash,
      };
      if (eventType === 'payment_refunded') {
        input.refundAmount = payload.amount;
        input.refundMode = 'cumulative';
        input.refundCurrency = payload.currency;
      }
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
      const response = toWebhookErrorResponse(error);
      if (response.status === 500) return next(error);
      return res.status(response.status).json(response.body);
    }
  };
}

async function normalizeStripeEvent(event, eventType, stripe) {
  const object = event?.data?.object || {};
  const metadata = object.metadata || {};
  const paymentIntentId = event.type.startsWith('payment_intent.')
    ? object.id
    : typeof object.payment_intent === 'string'
      ? object.payment_intent
      : object.payment_intent?.id;
  // Refund settlement is keyed by the original PaymentIntent, not the Charge ID.
  // If Stripe omits that link, reject the event instead of persisting a mismatched payment ID.
  const paymentId = paymentIntentId;
  if (metadata.orderId && object.client_reference_id && String(metadata.orderId) !== String(object.client_reference_id)) {
    throw new Error('payment_order_mismatch');
  }
  let orderId = metadata.orderId || object.client_reference_id;

  if (eventType === 'payment_refunded' && paymentIntentId) {
    if (!object.refunded) {
      return {
        eventId: event.id,
        provider: 'stripe',
        eventType,
        paymentId: String(paymentId || ''),
        orderId: String(orderId || ''),
        amount: 0,
        currency: String(object.currency || '').toUpperCase(),
        status: 'refunded',
        fullRefund: false,
      };
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(String(paymentIntentId));
    const paymentIntentOrderId = paymentIntent?.metadata?.orderId || paymentIntent?.client_reference_id;
    if (orderId && paymentIntentOrderId && String(orderId) !== String(paymentIntentOrderId)) {
      throw new Error('payment_order_mismatch');
    }
    orderId = orderId || paymentIntentOrderId;
  }

  const currency = String(object.currency || '').toUpperCase();
  const amountMinor = eventType === 'payment_refunded'
    ? object.amount_refunded
    : object.amount_total ?? object.amount_received ?? object.amount;
  const amount = eventType === 'payment_failed'
    ? 0
    : fromStripeMinorUnits(typeof amountMinor === 'number' ? amountMinor : Number(amountMinor), currency);
  return {
    eventId: event.id,
    provider: 'stripe',
    eventType,
    checkoutSessionId: event.type.startsWith('checkout.session.') ? String(object.id || '') : null,
    paymentId: String(paymentId || ''),
    orderId: String(orderId || ''),
    amount,
    currency,
    status: eventType === 'payment_succeeded'
      ? 'succeeded'
      : eventType === 'payment_refunded' ? 'refunded' : 'failed',
    fullRefund: eventType !== 'payment_refunded' || object.refunded === true,
  };
}
