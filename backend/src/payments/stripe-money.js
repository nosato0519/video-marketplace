const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF','CLP','DJF','GNF','JPY','KMF','KRW','MGA','PYG','RWF','UGX','VND','VUV','XAF','XOF','XPF',
]);
const THREE_DECIMAL_CURRENCIES = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);
const TWO_DECIMAL_ZERO_VALUE_CURRENCIES = new Set(['ISK', 'UGX']);

export function stripeCurrencyMinorUnitFactor(currency) {
  const normalized = String(currency || '').toUpperCase();
  if (ZERO_DECIMAL_CURRENCIES.has(normalized)) return 1;
  if (THREE_DECIMAL_CURRENCIES.has(normalized)) return 1000;
  return 100;
}

export function toStripeMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('checkout_amount_invalid');
  const normalizedCurrency = String(currency || '').toUpperCase();
  if (TWO_DECIMAL_ZERO_VALUE_CURRENCIES.has(normalizedCurrency) && !Number.isInteger(value)) {
    throw new Error('checkout_amount_precision_invalid');
  }
  const scaled = value * stripeCurrencyMinorUnitFactor(normalizedCurrency);
  const rounded = Math.round(scaled);
  if (!Number.isSafeInteger(rounded) || Math.abs(scaled - rounded) > 1e-7) {
    throw new Error('checkout_amount_precision_invalid');
  }
  return rounded;
}

export function fromStripeMinorUnits(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('stripe_amount_invalid');
  const normalizedCurrency = String(currency || '').toUpperCase();
  if (TWO_DECIMAL_ZERO_VALUE_CURRENCIES.has(normalizedCurrency) && value % 100 !== 0) {
    throw new Error('stripe_amount_precision_invalid');
  }
  return value / stripeCurrencyMinorUnitFactor(normalizedCurrency);
}
