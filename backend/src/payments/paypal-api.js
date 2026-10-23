import { createHash } from 'node:crypto';

let cachedToken = null;
let tokenExpiresAt = 0;
let cachedTokenKey = null;

export function getPayPalApiBaseUrl(environment = process.env.PAYPAL_ENVIRONMENT) {
  return environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

export function formatPayPalAmount(amount, currency) {
  const normalizedCurrency = String(currency || '').toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) throw new Error('checkout_currency_invalid');
  const decimals = ['BHD', 'IQD', 'JOD', 'KWD', 'LYD', 'OMR', 'TND'].includes(normalizedCurrency)
    ? 3
    : ['BIF', 'CLP', 'DJF', 'GNF', 'ISK', 'JPY', 'KMF', 'KRW', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'].includes(normalizedCurrency)
      ? 0
      : 2;
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('checkout_amount_invalid');
  const formatted = numericAmount.toFixed(decimals);
  if (Number(formatted) <= 0 || Math.abs(Number(formatted) - numericAmount) > 1e-8) {
    throw new Error('checkout_amount_precision_invalid');
  }
  return formatted;
}

export async function paypalApiRequest(path, { method = 'GET', body, requestId, fetchImpl = fetch } = {}) {
  const clientId = process.env.PAYPAL_CLIENT_ID?.trim();
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('payment_provider_not_configured:paypal');

  const token = await getAccessToken({ clientId, clientSecret, fetchImpl });
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
  };
  if (requestId) headers['PayPal-Request-Id'] = createHash('sha256').update(String(requestId)).digest('hex').slice(0, 32);

  const response = await fetchImpl(`${getPayPalApiBaseUrl()}${path}`, {
    method,
    headers,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error('paypal_api_request_failed');
    error.statusCode = response.status >= 500 ? 503 : 502;
    throw error;
  }
  return payload;
}

async function getAccessToken({ clientId, clientSecret, fetchImpl }) {
  const tokenKey = createHash('sha256').update(`${getPayPalApiBaseUrl()}|${clientId}|${clientSecret}`).digest('hex');
  if (cachedToken && cachedTokenKey === tokenKey && Date.now() < tokenExpiresAt - 30_000) return cachedToken;

  const response = await fetchImpl(`${getPayPalApiBaseUrl()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    },
    body: 'grant_type=client_credentials',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    cachedToken = null;
    cachedTokenKey = null;
    tokenExpiresAt = 0;
    const error = new Error('paypal_authentication_failed');
    error.statusCode = response.status >= 500 ? 503 : 502;
    throw error;
  }
  cachedToken = payload.access_token;
  cachedTokenKey = tokenKey;
  tokenExpiresAt = Date.now() + Math.max(60, Number(payload.expires_in) || 300) * 1000;
  return cachedToken;
}
