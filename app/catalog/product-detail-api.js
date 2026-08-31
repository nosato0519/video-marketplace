const DEFAULT_API_BASE = '';

export async function fetchProductDetail(id, { apiBase = DEFAULT_API_BASE, locale = 'en', signal } = {}) {
  const response = await fetch(`${apiBase}/api/catalog/products/${encodeURIComponent(id)}?locale=${encodeURIComponent(locale)}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal
  });
  if (!response.ok) throw new Error(`PRODUCT_REQUEST_FAILED_${response.status}`);
  const payload = await response.json();
  return payload.data || null;
}
