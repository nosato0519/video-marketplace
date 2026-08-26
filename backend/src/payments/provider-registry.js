import { createCheckoutSession } from './payment-provider.js';

export function getPaymentProvider() {
  const provider = process.env.PAYMENT_PROVIDER;

  if (!provider) {
    return null;
  }

  throw new Error(`unsupported_payment_provider:${provider}`);
}

export function startProviderCheckout({ order, reference }) {
  const provider = getPaymentProvider();
  if (!provider) throw new Error('payment_provider_unavailable');

  return createCheckoutSession({ order, provider, reference });
}
