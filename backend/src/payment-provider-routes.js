import {
  getConfigurablePaymentProviders,
  validatePaymentProviderConfig,
} from './payments/payment-provider-config.js';
import {
  configurePaymentProvider,
  getPersistedPaymentProviderSettings,
  persistPaymentProviderSettings,
  deletePersistedPaymentProviderSettings,
} from './payments/payment-provider-settings.js';

export function registerPaymentProviderRoutes(app, { requireAdmin } = {}) {
  const guard = typeof requireAdmin === 'function' ? requireAdmin : (_req, _res, next) => next();

  app.get('/api/admin/payment-providers', guard, (_req, res) => {
    res.json({ providers: getConfigurablePaymentProviders() });
  });

  app.get('/api/admin/payment-providers/settings', guard, async (req, res, next) => {
    try {
      res.json({ settings: await getPersistedPaymentProviderSettings(req.query.ownerId ?? null) });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/payment-providers/validate', guard, (req, res, next) => {
    try {
      const { providerId, credentials } = req.body ?? {};
      const result = validatePaymentProviderConfig({ providerId, credentials });
      res.json({
        providerId: result.providerId,
        secretEnv: result.secretEnv,
        configured: result.configured,
        valid: true,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/admin/payment-providers/configure', guard, async (req, res, next) => {
    try {
      const result = configurePaymentProvider(req.body ?? {});
      const persisted = await persistPaymentProviderSettings(result);
      res.json({ setting: persisted });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/admin/payment-providers/:providerId', guard, async (req, res, next) => {
    try {
      const ownerId = req.query.ownerId ?? req.body?.ownerId;
      const removed = await deletePersistedPaymentProviderSettings({
        ownerId,
        providerId: req.params.providerId,
      });
      res.json({ removed });
    } catch (error) {
      next(error);
    }
  });
}
