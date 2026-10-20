import { getConfigurablePaymentProviders } from './payments/payment-provider-config.js';

const deploymentManagedResponse = (_req, res) => {
  res.status(409).json({
    error: 'payment_configuration_managed_by_environment',
    message: 'Configure payment credentials and URLs in the deployment environment, then restart or redeploy the service.',
    documentation: 'docs/PAYMENTS.md',
  });
};

export function registerPaymentProviderRoutes(app, { requireAdmin } = {}) {
  const guard = typeof requireAdmin === 'function' ? requireAdmin : (_req, _res, next) => next();

  app.get('/api/admin/payment-providers', guard, (_req, res) => {
    res.json({
      source: 'environment',
      providers: getConfigurablePaymentProviders(),
    });
  });

  app.get('/api/admin/payment-providers/settings', guard, (_req, res) => {
    res.json({
      source: 'environment',
      settings: [],
      message: 'Payment settings are managed through deployment environment variables.',
    });
  });

  app.post('/api/admin/payment-providers/validate', guard, deploymentManagedResponse);
  app.post('/api/admin/payment-providers/configure', guard, deploymentManagedResponse);
  app.delete('/api/admin/payment-providers/:providerId', guard, deploymentManagedResponse);
}
