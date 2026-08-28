async function request(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
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
  list: () => request('/api/library'),
};
