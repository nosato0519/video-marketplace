import express from 'express';
import crypto from 'node:crypto';
import { verifyWebhookSignature } from './webhook-signature.js';
import { recordPaymentEvent } from './payment-event-ledger.js';
import { completePayment } from './complete-payment.js';

export function registerPaymentWebhookRoutes(app) {
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

        const payload = JSON.parse(rawBody.toString('utf8'));
        const eventId = payload.eventId;
        const provider = payload.provider;
        const eventType = payload.eventType;
        const providerPaymentId = payload.paymentId;
        const orderId = payload.orderId;
        const payloadHash = crypto.createHash('sha256').update(rawBody).digest('hex');

        const recorded = await recordPaymentEvent({
          provider,
          eventId,
          eventType,
          providerPaymentId,
          payloadHash,
          orderId,
        });

        if (recorded.duplicate) return res.status(200).json({ received: true, duplicate: true });
        if (eventType !== 'payment_succeeded') {
          return res.status(200).json({ received: true, processed: false });
        }

        const result = await completePayment({
          eventId,
          provider,
          providerPaymentId,
          orderId,
          payloadHash,
        });

        return res.status(200).json({ received: true, result });
      } catch (error) {
        return next(error);
      }
    }
  );
}
