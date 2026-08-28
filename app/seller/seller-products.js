function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function productRow(product) {
  const price = new Intl.NumberFormat(undefined, { style: 'currency', currency: product.price_currency || 'JPY' }).format(Number(product.price_amount || 0));
  const publishAction = product.status === 'published'
    ? `<button class="button secondary" data-action="unpublish" data-id="${escapeHtml(product.id)}">Unpublish</button>`
    : `<button class="button" data-action="publish" data-id="${escapeHtml(product.id)}">Publish</button>`;
  return `<article class="seller-card" data-product-id="${escapeHtml(product.id)}"><div><p class="eyebrow">${escapeHtml(product.status)}</p><h2>${escapeHtml(product.title || 'Untitled video')}</h2><p>${escapeHtml(product.description || 'No description')}</p><strong>${price}</strong></div><div class="hero-actions"><button class="button secondary" data-action="edit" data-id="${escapeHtml(product.id)}">Edit</button>${publishAction}</div></article>`;
}

export async function renderSellerProducts(root) {
  root.innerHTML = `<main class="seller-shell"><header class="seller-header"><div><p class="eyebrow">Creator</p><h1>My videos</h1><p>Create, edit and publish your video products.</p></div><button class="button" id="new-product">New video</button></header><p id="seller-products-message" class="microcopy" aria-live="polite">Loading products…</p><section id="seller-products-list" class="seller-grid"></section></main>`;
  const message = root.querySelector('#seller-products-message');
  const list = root.querySelector('#seller-products-list');

  async function load() {
    message.textContent = 'Loading products…';
    try {
      const data = await request('/api/seller/products');
      list.innerHTML = data.products?.length ? data.products.map(productRow).join('') : '<section class="empty-state"><h2>No videos yet</h2><p>Create your first draft product to get started.</p></section>';
      message.textContent = `${data.products?.length || 0} product(s)`;
    } catch (error) {
      message.textContent = error.status === 401 ? 'Please sign in as a seller.' : 'Unable to load products.';
    }
  }

  root.querySelector('#new-product').addEventListener('click', async () => {
    const title = window.prompt('Video title');
    if (!title?.trim()) return;
    const price = window.prompt('Price in JPY', '1000');
    if (price === null) return;
    try {
      await request('/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title: title.trim(), priceAmount: Number(price), priceCurrency: 'JPY' }) });
      await load();
    } catch (error) {
      message.textContent = error.body?.error || error.message || 'Unable to create product.';
    }
  });

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    try {
      if (action === 'edit') {
        const current = await request(`/api/seller/products/${encodeURIComponent(id)}`);
        const title = window.prompt('Video title', current.product.title || '');
        if (title === null) return;
        const description = window.prompt('Description', current.product.description || '');
        if (description === null) return;
        await request(`/api/seller/products/${encodeURIComponent(id)}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, description }) });
      } else {
        await request(`/api/seller/products/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      }
      await load();
    } catch (error) {
      message.textContent = error.body?.error || error.message || 'Unable to update product.';
    }
  });

  await load();
}
