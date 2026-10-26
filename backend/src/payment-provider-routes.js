import { query, withTransaction } from './db.js';
import { getConfigurablePaymentProviders } from './payments/payment-provider-config.js';

const ALLOWED_PROVIDER_IDS = new Set(['stripe', 'paypal']);

function getRequestedProviderIds(value) {
  if (!Array.isArray(value) || value.length < 1) return null;
  const ids = [...new Set(value.map((id) => String(id).trim().toLowerCase()))];
  if (ids.some((id) => !ALLOWED_PROVIDER_IDS.has(id))) return null;
  return ids;
}

function getEnabledIdsFromEnvironment() {
  const configured = process.env.PAYMENT_PROVIDERS_ENABLED;
  const ids = (configured ? configured.split(',') : [process.env.PAYMENT_PROVIDER || ''])
    .map((id) => id.trim().toLowerCase())
    .filter((id) => ALLOWED_PROVIDER_IDS.has(id));
  return [...new Set(ids)];
}

export function registerPaymentProviderRoutes(app, { requireAdmin } = {}) {
  app.get('/api/payment-providers', (_req, res) => {
    const providers = getConfigurablePaymentProviders()
      .filter((provider) => provider.enabled && provider.configured)
      .map(({ id, name }) => ({ id, name }));
    res.json({ providers });
  });

  const guard = typeof requireAdmin === 'function' ? requireAdmin : (_req, _res, next) => next();

  app.get('/api/admin/payment-providers', guard, async (_req, res, next) => {
    try {
      const result = await query(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_providers_enabled' LIMIT 1"
      );
      const stored = result.rows[0]?.setting_value?.value;
      const enabledIds = typeof stored === 'string' && stored.trim()
        ? stored.split(',').map((id) => id.trim()).filter((id) => ALLOWED_PROVIDER_IDS.has(id))
        : getEnabledIdsFromEnvironment();
      const providers = getConfigurablePaymentProviders().map((provider) => ({
        id: provider.id,
        name: provider.name,
        enabled: enabledIds.includes(provider.id),
        configured: provider.configured,
        missingEnvironmentVariables: provider.missingEnvironmentVariables,
      }));
      res.json({ providers });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/admin/payment-providers/settings', guard, async (_req, res, next) => {
    try {
      const result = await query(
        "SELECT setting_value FROM platform_settings WHERE setting_key = 'payment_providers_enabled' LIMIT 1"
      );
      const stored = result.rows[0]?.setting_value?.value;
      res.json({
        enabledProviders: typeof stored === 'string' && stored.trim()
          ? stored.split(',').map((id) => id.trim()).filter((id) => ALLOWED_PROVIDER_IDS.has(id))
          : getEnabledIdsFromEnvironment(),
      });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/admin/payment-providers/settings', guard, async (req, res, next) => {
    try {
      const ids = getRequestedProviderIds(req.body?.enabledProviders);
      if (!ids) return res.status(400).json({ error: 'invalid_enabled_payment_providers' });

      const providerStatus = getConfigurablePaymentProviders();
      const unavailable = ids.filter((id) => !providerStatus.some((provider) => provider.id === id && provider.configured));
      if (unavailable.length) {
        return res.status(409).json({
          error: 'payment_provider_credentials_missing',
          providers: unavailable,
          message: `有効化できません。サーバー環境変数を設定してください：${unavailable.map((id) => {
            const provider = providerStatus.find((item) => item.id === id);
            return `${id}: ${provider?.missingEnvironmentVariables?.join(', ') || '設定を確認してください'}`;
          }).join(' / ')}`,
        });
      }

      const value = ids.join(',');
      await withTransaction(async (db) => {
        await db.query(
          `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
           VALUES ('payment_providers_enabled', jsonb_build_object('value', $1::text), NOW())
           ON CONFLICT (setting_key)
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [value]
        );
      });
      process.env.PAYMENT_PROVIDERS_ENABLED = value;
      res.json({ enabledProviders: ids });
    } catch (error) {
      next(error);
    }
  });

  // Keep legacy endpoints explicit: credentials are managed only by server environment secrets.
  app.post('/api/admin/payment-providers/validate', guard, (_req, res) => {
    res.status(409).json({
      error: 'payment_credentials_managed_by_environment',
      message: 'Payment credentials must be set in the server environment; secret values are never stored through this UI.',
    });
  });
  app.post('/api/admin/payment-providers/configure', guard, (_req, res) => {
    res.status(409).json({
      error: 'payment_credentials_managed_by_environment',
      message: 'Payment credentials must be set in the server environment; secret values are never stored through this UI.',
    });
  });
  app.delete('/api/admin/payment-providers/:providerId', guard, (_req, res) => {
    res.status(409).json({
      error: 'payment_configuration_managed_by_settings',
      message: 'Use the payment settings screen to change enabled providers.',
    });
  });
}
