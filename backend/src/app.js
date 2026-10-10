import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { query } from './db.js';
import { registerCatalogRoutes } from './catalog-routes.js';
import { registerProductDetailRoutes } from './catalog/product-detail-routes.js';
import { registerOrderRoutes } from './order-routes.js';
import { registerCheckoutRoutes } from './checkout-routes.js';
import { registerPaymentWebhookRoutes } from './payments/webhook-routes.js';
import { createStripeWebhookHandler } from './payments/stripe-webhook.js';
import { recordPaymentEvent } from './payments/payment-event-ledger.js';
import { completePayment } from './payments/complete-payment.js';
import { failPayment } from './payments/fail-payment.js';
import { registerConfiguredMediaStreamRoutes } from './media/media-stream-app.js';
import { registerMediaDownloadRoutes } from './media/media-download-route.js';
import { loadSessionUser } from './auth/load-session-user.js';
import { requireRole } from './auth/authorize.js';
import { registerAuthRoutes } from './auth-routes.js';
import { registerAdminLocaleRoutes } from './i18n/admin-locale-routes.js';
import { registerProductTranslationRoutes } from './i18n/product-translation-routes.js';
import { registerLibraryRoutes } from './library-routes.js';
import sellerProductRoutes from './seller/product-routes.js';
import sellerMediaUploadRoutes from './media/media-upload-route.js';
import sellerProfileRoutes from './seller/profile-routes.js';
import sellerEarningsRoutes from './seller/earnings-routes.js';
import sellerPayoutRoutes from './seller/payout-routes.js';
import sellerApplicationRoutes from './seller/application-routes.js';
import adminPayoutRoutes from './admin/payout-routes.js';
import adminSellerVerificationRoutes from './admin/seller-verification-routes.js';
import adminSellerApplicationRoutes from './admin/seller-application-routes.js';
import adminContentModerationRoutes from './admin/content-moderation-routes.js';
import adminSettingsRoutes from './admin/settings-routes.js';
import contentReportRoutes from './content-report-routes.js';
import messageRoutes from './message-routes.js';
import { registerPaymentProviderRoutes } from './payment-provider-routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'sha256-ajdE6A2cenTjDNrPNLhA4wX+JDVhqYUwmdZ+XAeEvzw='"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      },
    },
  }));

  registerPaymentWebhookRoutes(app);
  app.post(
    '/api/payments/stripe/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    createStripeWebhookHandler({ recordPaymentEvent, completePayment, failPayment })
  );

  app.use('/api/seller/profile/verification-document', express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: '10mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(loadSessionUser);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'video-marketplace-api', version: '0.1.0' });
  });

  app.get('/api/ready', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ready', service: 'video-marketplace-api' });
    } catch (error) {
      console.error('Readiness check failed', error);
      res.status(503).json({ status: 'not_ready', service: 'video-marketplace-api' });
    }
  });

  registerAuthRoutes(app);
  registerCatalogRoutes(app);
  registerProductDetailRoutes(app);
  registerOrderRoutes(app);
  registerCheckoutRoutes(app);
  registerAdminLocaleRoutes(app);
  registerProductTranslationRoutes(app);
  registerLibraryRoutes(app);
  app.use('/api', contentReportRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/seller', sellerApplicationRoutes);
  app.use('/api/seller', sellerProductRoutes);
  app.use('/api/seller/media', sellerMediaUploadRoutes);
  app.use('/api/seller', sellerProfileRoutes);
  app.use('/api/seller', sellerEarningsRoutes);
  app.use('/api/seller', sellerPayoutRoutes);
  app.use('/api/admin', adminPayoutRoutes);
  app.use('/api/admin', adminSellerVerificationRoutes);
  app.use('/api/admin', adminSellerApplicationRoutes);
  app.use('/api/admin', adminContentModerationRoutes);
  app.use('/api/admin', adminSettingsRoutes);
  registerPaymentProviderRoutes(app, { requireAdmin: requireRole('admin') });
  const mediaStorage = registerConfiguredMediaStreamRoutes(app);
  registerMediaDownloadRoutes(app, { storage: mediaStorage });

  const publicRoot = path.resolve(process.cwd());
  app.get('/', (_req, res) => res.sendFile(path.join(publicRoot, 'index.html')));
  app.get('/styles.css', (_req, res) => res.sendFile(path.join(publicRoot, 'styles.css')));
  app.use('/pages', express.static(path.join(publicRoot, 'pages')));
  app.use('/seller', express.static(path.join(publicRoot, 'seller')));
  app.use('/app', express.static(path.join(publicRoot, 'app')));
  app.use('/shared', express.static(path.join(publicRoot, 'shared')));
  app.use('/locales', express.static(path.join(publicRoot, 'locales')));

  app.use((error, _req, res, _next) => {
    console.error(error);
    const status = Number(error?.statusCode) || 500;
    res.status(status).json({ error: status === 500 ? { code: 'INTERNAL_ERROR', message: 'Internal server error' } : (error.message || 'Request failed') });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  return app;
}