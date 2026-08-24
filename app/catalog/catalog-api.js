const DEFAULT_API_BASE = '';

function query(params) {
  return new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  ).toString();
}

export async function fetchCatalog({ apiBase = DEFAULT_API_BASE, locale = 'en', category = '', search = '', page = 1, limit = 24, signal } = {}) {
  const qs = query({ locale, category, search, page, limit });
  const response = await fetch(`${apiBase}/api/catalog/products?${qs}`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal
  });

  if (!response.ok) {
    throw new Error(`CATALOG_REQUEST_FAILED_${response.status}`);
  }

  return response.json();
}
