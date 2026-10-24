import crypto from 'node:crypto';
import { query } from '../db.js';
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
        let captureRequestError = null;
        try {
          await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
            method: 'POST',
            requestId: event.id || orderId,
            body: {},
          });
        } catch (error) {
          if (error.message !== 'paypal_api_request_failed') throw error;
          captureRequestError = error;
        }
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        const capture = unit?.payments?.captures?.find((item) => item.status === 'COMPLETED');
        if (!capture && captureRequestError) throw captureRequestError;
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
          refundedAmount <= 0 ||
          !Number.isFinite(capturedAmount) ||
          refundedAmount > capturedAmount + 0.001 ||
          !refundCurrency ||
          refundCurrency !== captureCurrency
        ) {
          return res.status(200).json({ received: true, ignored: true, reason: 'invalid_or_mismatched_refund' });
        }
        const orderId = String(capture.supplementary_data?.related_ids?.order_id || '');
        if (!orderId) return res.status(200).json({ received: true, ignored: true });
        const order = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(orderId)}`);
        const unit = order.purchase_units?.[0];
        return await settleEvent({
          res, event, eventType: 'payment_refunded', providerPaymentId: captureId,
          orderId: String(unit?.custom_id || unit?.reference_id || ''), checkoutSessionId: orderId,
          amount: Number(refund.amount?.value || 0), currency: String(refund.amount?.currency_code || '').toUpperCase(),
          refundAmount: refundedAmount, refundMode: 'incremental', refundCurrency,
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
  amount, currency, refundAmount, refundMode, refundCurrency, payloadHash, recordPaymentEvent, completePayment, failPayment, refundPayment,
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
    const result = await refundPayment({
      ...input,
      refundAmount: refundAmount ?? amount,
      refundMode: refundMode || 'incremental',
      refundCurrency: refundCurrency || currency,
    });
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


export function createPayPalReturnHandler({
  apiRequest = paypalApiRequest,
  recordPaymentEvent = defaultRecordPaymentEvent,
  completePayment = defaultCompletePayment,
} = {}) {
  return async function handlePayPalReturn(req, res) {
    const orderId = String(req.query?.orderId || '');
    const paypalOrderId = String(req.query?.token || '');
    if (!orderId || !paypalOrderId) {
      return res.redirect(303, '/pages/purchase-history.html?payment=processing');
    }

    try {
      const stored = await query(
        `SELECT o.id, o.status AS order_status, p.id AS payment_id,
                p.status AS payment_status, p.amount, p.currency,
                p.checkout_session_id
           FROM orders o
           JOIN payments p ON p.order_id = o.id AND p.provider = 'paypal'
          WHERE o.id = $1
          LIMIT 1`,
        [orderId]
      );
      const payment = stored.rows[0];
      if (!payment || payment.checkout_session_id !== paypalOrderId) {
        return res.redirect(303, '/pages/purchase-history.html?payment=processing');
      }
      if (payment.order_status === 'paid' && payment.payment_status === 'succeeded') {
        return res.redirect(303, `/pages/order-detail.html?orderId=${encodeURIComponent(orderId)}`);
      }
      if (payment.order_status !== 'pending' || payment.payment_status !== 'pending') {
        return res.redirect(303, '/pages/purchase-history.html?payment=processing');
      }

      let captureRequestError = null;
      try {
        await apiRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}/capture`, {
          method: 'POST',
          requestId: `return-${paypalOrderId}`,
          body: {},
        });
      } catch (error) {
        if (error.message !== 'paypal_api_request_failed') throw error;
        captureRequestError = error;
      }

      const paypalOrder = await apiRequest(`/v2/checkout/orders/${encodeURIComponent(paypalOrderId)}`);
      const unit = paypalOrder.purchase_units?.find((item) =>
        String(item.custom_id || item.reference_id || '') === orderId
      );
      const capture = unit?.payments?.captures?.find((item) => item.status === 'COMPLETED');
      if (!capture && captureRequestError) throw captureRequestError;
      if (paypalOrder.status !== 'COMPLETED' || !capture || !capture.id) {
        return res.redirect(303, '/pages/purchase-history.html?payment=processing');
      }

      const amount = Number(capture.amount?.value);
      const currency = String(capture.amount?.currency_code || '').toUpperCase();
      const providerPaymentId = String(capture.id);
      const payloadHash = crypto.createHash('sha256')
        .update(JSON.stringify({ paypalOrderId, orderId, providerPaymentId, amount, currency }))
        .digest('hex');
      const eventId = `return-${paypalOrderId}`;
      await recordPaymentEvent({
        provider: 'paypal',
        eventId,
        eventType: 'payment_succeeded',
        providerPaymentId,
        payloadHash,
        orderId,
      });
      await completePayment({
        eventId,
        provider: 'paypal',
        providerPaymentId,
        checkoutSessionId: paypalOrderId,
        orderId,
        payloadHash,
        payment: {
          eventId,
          provider: 'paypal',
          eventType: 'payment_succeeded',
          paymentId: providerPaymentId,
          provider_payment_id: providerPaymentId,
          orderId,
          order_id: orderId,
          amount,
          currency,
          status: 'succeeded',
        },
      });
      return res.redirect(303, `/pages/order-detail.html?orderId=${encodeURIComponent(orderId)}`);
    } catch (error) {
      console.error('PayPal return processing failed', { message: error?.message || 'unknown_error' });
      return res.redirect(303, '/pages/purchase-history.html?payment=processing');
    }
  };
}
