import express from 'express';
import helmet from 'helmet';
import { registerCatalogRoutes } from './catalog-routes.js';
import { registerProductDetailRoutes } from './catalog/product-detail-routes.js';
import { registerOrderRoutes } from './order-routes.js';
import { registerCheckoutRoutes } from './checkout-routes.js';
import { registerPaymentWebhookRoutes } from './payments/webhook-routes.js';
import { registerConfiguredMediaStreamRoutes } from './media/media-stream-app.js';
import { loadSessionUser } from './auth/load-session-user.js';

const app = express();
const port = Number(process.env.PORT || 3000);

app.disable('x-powered-by');
app.use(helmet());

// Webhooks must receive the raw body before the JSON parser runs so signature verification
// is performed against the exact bytes received from the payment provider.
registerPaymentWebhookRoutes(app);

app.use(express.json({ limit: '1mb' }));
app.use(loadSessionUser);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'video-marketplace-api', version: '0.1.0' });
});

registerCatalogRoutes(app);
registerProductDetailRoutes(app);
registerOrderRoutes(app);
registerCheckoutRoutes(app);
registerConfiguredMediaStreamRoutes(app);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
});

app.use((_req, res) => {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
});

app.listen(port, () => {
  console.log(`Video marketplace API listening on port ${port}`);
});
