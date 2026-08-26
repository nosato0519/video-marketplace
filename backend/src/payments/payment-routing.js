import { getPaymentProviderSettings } from './payment-provider-settings.js';
import { createPaymentProvider } from './payment-provider.js';

/**
 * Resolve a seller/tenant's configured payment provider without exposing credentials.
 * Provider credentials remain outside the checkout request and are resolved by the
 * provider adapter from the deployment's secure credential store.
 */
export function resolvePaymentProvider({ ownerId, providerId = null } = {}) {
  if (!ownerId) throw new Error('payment_owner_required');

  const settings = getPaymentProviderSettings().find((setting) =>
    setting.ownerId === ownerId && (!providerId || setting.providerId === providerId)
  );

  if (!settings) throw new Error('payment_provider_not_configured');
  if (settings.status !== 'configured') throw new Error('payment_provider_not_ready');

  const provider = createPaymentProvider({ provider: settings.providerId });
  if (!provider.configured) throw new Error(`payment_provider_not_ready:${settings.providerId}`);

  return { provider, setting: { ...settings } };
}
