async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = { error: { message: text } }; }
  if (!response.ok) {
    const error = new Error(body?.error?.message || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

export const checkoutApi = {
  purchaseIntent(productId, locale = 'en') {
    return request(`/api/catalog/products/${encodeURIComponent(productId)}/purchase-intent`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ locale }),
    });
  },
  createOrder(productId) {
    return request('/api/orders', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId }),
    });
  },
  checkout(orderId) {
    return request(`/api/orders/${encodeURIComponent(orderId)}/checkout`, { method: 'POST' });
  },
};
