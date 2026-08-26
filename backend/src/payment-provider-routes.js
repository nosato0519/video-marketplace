import {
  getConfigurablePaymentProviders,
  validatePaymentProviderConfig,
} from './payments/payment-provider-config.js';
import {
  configurePaymentProvider,
  getPaymentProviderSettings,
  clearPaymentProviderSettings,
} from './payments/payment-provider-settings.js';

export function registerPaymentProviderRoutes(app, { requireAdmin } = {}) {
  const guard = typeof requireAdmin === 'function' ? requireAdmin : (_req, _res, next) => next();

  app.get('/api/admin/payment-providers', guard, (_req, res) => {
    res.json({ providers: getConfigurablePaymentProviders() });
  });

  app.get('/api/admin/payment-providers/settings', guard, (_req, res) => {
    res.json({ settings: getPaymentProviderSettings() });
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

  app.post('/api/admin/payment-providers/configure', guard, (req, res, next) => {
    try {
      const result = configurePaymentProvider(req.body ?? {});
      res.json({ setting: result });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/admin/payment-providers/:providerId', guard, (req, res) => {
    const removed = clearPaymentProviderSettings(req.params.providerId);
    res.json({ removed });
  });
}
