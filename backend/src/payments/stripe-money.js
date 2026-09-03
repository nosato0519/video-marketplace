const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF',
]);
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

export function stripeCurrencyMinorUnitFactor(currency) {
  const normalized = String(currency || '').toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) return 1000;
  return 100;
}

export function toStripeMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('checkout_amount_invalid');
  return Math.round(value * stripeCurrencyMinorUnitFactor(currency));
}

export function fromStripeMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('stripe_amount_invalid');
  return value / stripeCurrencyMinorUnitFactor(currency);
}
