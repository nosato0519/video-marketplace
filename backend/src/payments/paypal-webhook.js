import crypto from 'node:crypto';
import { paypalApiRequest } from './paypal-api.js';
import { validateWebhookPayload } from './webhook-payload.js';
import { recordPaymentEvent as defaultRecordPaymentEvent } from './payment-event-ledger.js';
import { completePayment as defaultCompletePayment } from './complete-payment.js';
import { failPayment as defaultFailPayment } from './fail-payment.js';
import { refundPayment as defaultRefundPayment } from './refund-payment.js';
import { toWebhookErrorResponse } from './webhook-error.js';

export function createPayPalWebhookHandler({
  recordPaymentEvent = defaultRecordPaymentEvent,
  completePayment = defaultCompletePayment,
  failPayment = defaultFailPayment,
  refundPayment = defaultRefundPayment,
  apiRequest = paypalApiRequest,
} = {}) {
  return async function handlePayPalWebhook(req, res, next) {
    try {
      const webhookId = process.env.PAYPAL_WEBHOOK_ID?.trim();
      if (!webhookId || !process.env.PAYPAL_CLIENT_ID?.trim() || !process.env.PAYPAL_CLIENT_SECRET?.trim()) {
        return res.status(503).json({ error: { code: 'PAYMENT_PROVIDER_NOT_CONFIGURED', message: 'PayPal webhook configuration is incomplete' } });
      }
      if (!Buffer.isBuffer(req.body)) {
        return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_BODY', message: 'Webhook body must be raw JSON bytes' } });
      }
      const rawBody = req.body;
      let event;
      try {
        event = JSON.parse(rawBody.toString('utf8'));
      } catch {
        return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_BODY', message: 'Webhook body is invalid JSON' } });
      }

      const verified = await apiRequest('/v1/notifications/verify-webhook-signature', {
        method: 'POST',
        body: {
          auth_algo: req.get('paypal-auth-algo'),
          cert_url: req.get('paypal-cert-url'),
          transmission_id: req.get('paypal-transmission-id'),
          transmission_sig: req.get('paypal-transmission-sig'),
          transmission_time: req.get('paypal-transmission-time'),
          webhook_id: webhookId,
          webhook_event: event,
        },
      });
      if (verified.verification_status !== 'SUCCESS') {
        return res.status(401).json({ error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid PayPal webhook signature' } });
      }

      const eventType = String(event.event_type || '');
      const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');
      if (eventType === 'CHECKOUT.ORDER.APPROVED') {
        const orderId = String(event.resource?.id || '');
        if (!orderId) return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_PAYLOAD', message: 'PayPal order ID is missing' } });
        try {
          await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: 'POST',
            requestId: event.id || orderId,
            body: {},
          });
        } catch (error) {
          if (error.message !== 'paypal_api_request_failed') throw error;
          // A duplicate approval event may arrive after the order was already captured.
        }
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        const capture = unit?.payments?.captures?.find((item) => item.status === 'COMPLETED');
        if (!capture) return res.status(202).json({ received: true, pending: true });
        return await settleEvent({
          res, event, eventType: 'payment_succeeded', providerPaymentId: String(capture.id),
          orderId: String(unit.custom_id || unit.reference_id || ''), checkoutSessionId: orderId,
          amount: Number(capture.amount?.value), currency: String(capture.amount?.currency_code || '').toUpperCase(),
          payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
        });
      }

      if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
        const capture = event.resource || {};
        const orderId = String(capture.supplementary_data?.related_ids?.order_id || '');
        if (!capture.id || !orderId) return res.status(200).json({ received: true, ignored: true });
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        return await settleEvent({
          res, event, eventType: 'payment_succeeded', providerPaymentId: String(capture.id),
          orderId: String(unit?.custom_id || unit?.reference_id || ''), checkoutSessionId: orderId,
          amount: Number(capture.amount?.value), currency: String(capture.amount?.currency_code || '').toUpperCase(),
          payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
        });
      }

      if (eventType === 'PAYMENT.CAPTURE.DENIED') {
        const capture = event.resource || {};
        const orderId = String(capture.supplementary_data?.related_ids?.order_id || '');
        if (!capture.id || !orderId) return res.status(200).json({ received: true, ignored: true });
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        return await settleEvent({
          res, event, eventType: 'payment_failed', providerPaymentId: String(capture.id),
          orderId: String(unit?.custom_id || unit?.reference_id || ''), checkoutSessionId: orderId,
          amount: 0, currency: String(capture.amount?.currency_code || '').toUpperCase(),
          payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
        });
      }

      if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
        const refund = event.resource || {};
        const captureId = String(refund.supplementary_data?.related_ids?.capture_id || '');
        if (!captureId) return res.status(200).json({ received: true, ignored: true });
        const capture = await apiRequest(`/v2/payments/captures/${encodeURIComponent(captureId)}`);
        const refundedAmount = Number(refund.amount?.value);
        const capturedAmount = Number(capture.amount?.value);
        const refundCurrency = String(refund.amount?.currency_code || '').toUpperCase();
        const captureCurrency = String(capture.amount?.currency_code || '').toUpperCase();
        if (
          !Number.isFinite(refundedAmount) ||
          !Number.isFinite(capturedAmount) ||
          Math.abs(refundedAmount - capturedAmount) > 1e-8 ||
          !refundCurrency ||
          refundCurrency !== captureCurrency
        ) {
          return res.status(200).json({ received: true, ignored: true, reason: 'partial_or_mismatched_refund_not_supported' });
        }
        const orderId = String(capture.supplementary_data?.related_ids?.order_id || '');
        if (!orderId) return res.status(200).json({ received: true, ignored: true });
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        return await settleEvent({
          res, event, eventType: 'payment_refunded', providerPaymentId: captureId,
          orderId: String(unit?.custom_id || unit?.reference_id || ''), checkoutSessionId: orderId,
          amount: Number(refund.amount?.value || 0), currency: String(refund.amount?.currency_code || '').toUpperCase(),
          payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
        });
      }

      return res.status(200).json({ received: true, ignored: true });
    } catch (error) {
      const response = toWebhookErrorResponse(error);
      if (response.status === 500) return next(error);
      return res.status(response.status).json(response.body);
    }
  };
}

async function settleEvent({
  res, event, eventType, providerPaymentId, orderId, checkoutSessionId,
  amount, currency, payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
}) {
  if (!orderId || !providerPaymentId || !event.id) {
    return res.status(400).json({ error: { code: 'INVALID_WEBHOOK_PAYLOAD', message: 'Required PayPal payment identifiers are missing' } });
  }
  const mappedType = eventType === 'payment_succeeded'
    ? 'payment_succeeded'
    : eventType === 'payment_refunded' ? 'payment_refunded' : 'payment_failed';
  const recorded = await recordPaymentEvent({
    provider: 'paypal',
    eventId: String(event.id),
    eventType: mappedType,
    providerPaymentId,
    payloadHash,
    orderId,
  });
  if (recorded.duplicate && recorded.event?.status === 'processed') {
    return res.status(200).json({ received: true, duplicate: true });
  }
  const input = {
    eventId: String(event.id),
    provider: 'paypal',
    providerPaymentId,
    checkoutSessionId,
    orderId,
    payloadHash,
  };
  if (mappedType === 'payment_failed') {
    const result = await failPayment(input);
    return res.status(200).json({ received: true, result });
  }
  if (mappedType === 'payment_refunded') {
    const result = await refundPayment(input);
    return res.status(200).json({ received: true, result });
  }
  const payload = {
    eventId: String(event.id),
    provider: 'paypal',
    eventType: mappedType,
    paymentId: providerPaymentId,
    provider_payment_id: providerPaymentId,
    orderId,
    order_id: orderId,
    amount,
    currency,
    status: 'succeeded',
  };
  validateWebhookPayload(payload);
  const result = await completePayment({ ...input, payment: payload });
  return res.status(200).json({ received: true, result });
}
