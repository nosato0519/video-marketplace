import test from 'node:test';
import assert from 'node:assert/strict';
import { listPaymentProviderOptions, selectPaymentProvider } from './payment-provider-selection.js';

test('lists only implemented global providers for overseas installations', () => {
  const providers = listPaymentProviderOptions({ region: 'global' });
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe', 'paypal']);
});

test('lists only implemented providers for Japan installations', () => {
  const providers = listPaymentProviderOptions({ region: 'japan', currency: 'JPY' });
  assert.deepEqual(providers.map((provider) => provider.id), ['stripe', 'paypal']);
});

test('rejects providers whose checkout adapter is not implemented', () => {
  assert.throws(
    () => selectPaymentProvider({ providerId: 'paypay', region: 'global', currency: 'USD' }),
    /payment_provider_adapter_not_ready:paypay/
  );
});

test('does not allow configuring an unimplemented regional provider', () => {
  assert.throws(
    () => selectPaymentProvider({ providerId: 'paypay', region: 'japan', currency: 'JPY' }),
    /payment_provider_adapter_not_ready:paypay/
  );
});
