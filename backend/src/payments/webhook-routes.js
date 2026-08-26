import express from 'express';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from './webhook-signature.js';
import { validateWebhookPayload } from './webhook-payload.js';
import { recordPaymentEvent as defaultRecordPaymentEvent } from './payment-event-ledger.js';
import { completePayment as defaultCompletePayment } from './complete-payment.js';
import { refundPayment as defaultRefundPayment } from './refund-payment.js';
import { toWebhookErrorResponse } from './webhook-error.js';

export function registerPaymentWebhookRoutes(
  app,
  {
    recordPaymentEvent = defaultRecordPaymentEvent,
    completePayment = defaultCompletePayment,
    refundPayment = defaultRefundPayment,
  } = {}
) {
  app.post(
    '/api/payments/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    async (req, res, next) => {
      try {
        const rawBody = req.body;
        const signature = req.get('x-payment-signature');
        const secret = process.env.PAYMENT_WEBHOOK_SECRET;

        if (!verifyWebhookSignature({ rawBody, signature, secret })) {
          return res.status(401).json({
            error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Invalid webhook signature' },
          });
        }

        const payload = validateWebhookPayload(JSON.parse(rawBody.toString('utf8')));
        const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

        const recorded = await recordPaymentEvent({
          provider: payload.provider,
          eventId: payload.eventId,
          eventType: payload.eventType,
          providerPaymentId: payload.paymentId,
          payloadHash,
          orderId: payload.orderId,
        });

        if (recorded.duplicate) return res.status(200).json({ received: true, duplicate: true });
        if (payload.eventType === 'payment_failed') {
          return res.status(200).json({ received: true, processed: false });
        }

        if (payload.eventType === 'payment_refunded') {
          const result = await refundPayment({
            eventId: payload.eventId,
            provider: payload.provider,
            providerPaymentId: payload.paymentId,
            orderId: payload.orderId,
            payloadHash,
          });
          return res.status(200).json({ received: true, result });
        }

        const result = await completePayment({
          eventId: payload.eventId,
          provider: payload.provider,
          providerPaymentId: payload.paymentId,
          orderId: payload.orderId,
          payloadHash,
          payment: payload,
        });

        return res.status(200).json({ received: true, result });
      } catch (error) {
        const response = toWebhookErrorResponse(error);
        if (response.status === 500) return next(error);
        return res.status(response.status).json(response.body);
      }
    }
  );
}
