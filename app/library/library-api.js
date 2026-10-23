async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    cache: 'no-store',
    signal: options.signal,
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Unable to load library');
    error.status = response.status;
    throw error;
  }
  return body;
}

export const libraryApi = {
  list: (options) => request('/api/library', options),
  orders: () => request('/api/orders'),
};
