export const PAYMENT_PROVIDER_CATALOG = Object.freeze([
  {
    id: 'stripe',
    name: 'Stripe',
    regions: Object.freeze(['global', 'japan']),
    currencies: 'multi',
    status: 'available',
  },
  {
    id: 'paypal',
    name: 'PayPal',
    regions: Object.freeze(['global', 'japan']),
    currencies: 'multi',
    status: 'available',
  },
  {
    id: 'adyen',
    name: 'Adyen',
    regions: Object.freeze(['global', 'japan']),
    currencies: 'multi',
    status: 'not_implemented',
  },
  {
    id: 'paddle',
    name: 'Paddle',
    regions: Object.freeze(['global']),
    currencies: 'multi',
    status: 'not_implemented',
  },
  {
    id: 'paypay',
    name: 'PayPay',
    regions: Object.freeze(['japan']),
    currencies: Object.freeze(['JPY']),
    status: 'not_implemented',
  },
]);

function copyProvider(provider) {
  return {
    ...provider,
    regions: [...provider.regions],
    currencies: Array.isArray(provider.currencies) ? [...provider.currencies] : provider.currencies,
  };
}

export function getPaymentProviderCatalog() {
  return PAYMENT_PROVIDER_CATALOG.map(copyProvider);
}

export function getPaymentProviderConfig(providerId) {
  const provider = PAYMENT_PROVIDER_CATALOG.find((entry) => entry.id === providerId);
  return provider ? copyProvider(provider) : null;
}
