import { getPaymentProviderSettings } from './payment-provider-settings.js';
import { createPaymentProvider } from './payment-provider.js';

export function getOwnerPaymentProviderHealth(ownerId) {
  if (!ownerId) throw new Error('payment_owner_required');

  return getPaymentProviderSettings(ownerId).map((setting) => {
    try {
      const provider = createPaymentProvider({ provider: setting.providerId });
      return {
        providerId: setting.providerId,
        status: provider.configured ? 'ready' : 'adapter_unavailable',
        region: setting.region,
        currency: setting.currency,
      };
    } catch (error) {
      return {
        providerId: setting.providerId,
        status: 'configuration_error',
        error: error.message,
        region: setting.region,
        currency: setting.currency,
      };
    }
  });
}
