import test from 'node:test';
import assert from 'node:assert/strict';
import { listPaymentProviderOptions, selectPaymentProvider } from './payment-provider-selection.js';

test('lists global providers for overseas installations', () => {
  const providers = listPaymentProviderOptions({ region: 'global' });
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe', 'paypal', 'adyen', 'paddle']);
});

test('lists PayPay for Japan installations', () => {
  const providers = listPaymentProviderOptions({ region: 'japan', currency: 'JPY' });
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe', 'paypal', 'adyen', 'paypay']);
});

test('rejects a provider that is unavailable in the selected region', () => {
  assert.throws(
    () => selectPaymentProvider({ providerId: 'paypay', region: 'global', currency: 'USD' }),
    /payment_provider_region_unsupported:paypay:global/
  );
});

test('rejects an unsupported currency for a regional provider', () => {
  assert.throws(
    () => selectPaymentProvider({ providerId: 'paypay', region: 'japan', currency: 'USD' }),
    /payment_provider_currency_unsupported:paypay:USD/
  );
});
