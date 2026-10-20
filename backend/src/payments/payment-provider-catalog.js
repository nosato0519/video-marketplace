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
    status: 'not_implemented',
  },
  {
    id: 'adyen',
    name: 'Adyen',
    regions: ['global', 'japan'],
    currencies: 'multi',
    status: 'not_implemented',
  },
  {
    id: 'paddle',
    name: 'Paddle',
    regions: ['global'],
    currencies: 'multi',
    status: 'not_implemented',
  },
  {
    id: 'paypay',
    name: 'PayPay',
    regions: ['japan'],
    currencies: ['JPY'],
    status: 'not_implemented',
  },
]);

export function getPaymentProviderCatalog() {
  return PAYMENT_PROVIDER_CATALOG.map((provider) => ({ ...provider }));
}

export function getPaymentProviderConfig(providerId) {
  return PAYMENT_PROVIDER_CATALOG.find((provider) => provider.id === providerId) ?? null;
}
