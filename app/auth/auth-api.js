const JSON_HEADERS = { 'content-type': 'application/json' };

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: { message: text } }; }
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.message || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const authApi = {
  register: (email, password) => request('/api/auth/register', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password }) }),
  login: (email, password) => request('/api/auth/login', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify({ email, password }) }),
  me: () => request('/api/auth/me'),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
};
