export const PAYMENT_PROVIDER_CATALOG = Object.freeze([
  {
    id: 'stripe',
    name: 'Stripe',
    regions: ['global', 'japan'],
    currencies: 'multi',
    status: 'available',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    regions: ['global', 'japan'],
    currencies: 'multi',
    status: 'adapter_ready',
  },
  {
    id: 'adyen',
    name: 'Adyen',
    regions: ['global', 'japan'],
    currencies: 'multi',
    status: 'adapter_ready',
  },
  {
    id: 'paddle',
    name: 'Paddle',
    regions: ['global'],
    currencies: 'multi',
    status: 'adapter_ready',
  },
  {
    id: 'paypay',
    name: 'PayPay',
    regions: ['japan'],
    currencies: ['JPY'],
    status: 'adapter_ready',
  },
]);

export function getPaymentProviderCatalog() {
  return PAYMENT_PROVIDER_CATALOG.map((provider) => ({ ...provider }));
}

export function getPaymentProviderConfig(providerId) {
  return PAYMENT_PROVIDER_CATALOG.find((provider) => provider.id === providerId) ?? null;
}
