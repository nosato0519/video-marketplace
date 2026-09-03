function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
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

function formatPrice(product) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: product.price_currency || 'JPY', maximumFractionDigits: 2 }).format(Number(product.price_amount || 0));
  } catch {
    return `${Number(product.price_amount || 0).toLocaleString()} ${product.price_currency || 'JPY'}`;
  }
}

function formatBytes(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

function mediaSummary(product) {
  if (!product.media_asset_id) return { label: 'Video not attached', detail: 'Add a protected video before publishing.', ready: false };
  const status = String(product.media_status || '').toLowerCase();
  const ready = status === 'ready';
  if (ready) {
    const filename = product.media_original_filename ? escapeHtml(product.media_original_filename) : 'Protected video';
    const size = formatBytes(product.media_byte_size);
    return { label: 'Video ready', detail: `${filename}${size ? ` · ${size}` : ''}`, ready: true };
  }
  if (status === 'processing') return { label: 'Video processing', detail: 'Wait until validation finishes before publishing.', ready: false };
  if (status === 'deleted') return { label: 'Video unavailable', detail: 'Attach a new video before publishing.', ready: false };
  return { label: 'Video unavailable', detail: 'Check the uploaded media before publishing.', ready: false };
}

function statusLabel(status) {
  const labels = { draft: 'Draft', processing: 'Processing', submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', published: 'Published' };
  return labels[status] || String(status || 'Draft');
}

function productRow(product) {
  const published = product.status === 'published';
  const media = mediaSummary(product);
  const publishAction = published
    ? `<button class="button secondary" data-action="unpublish" data-id="${escapeHtml(product.id)}">Unpublish</button>`
    : `<button class="button${media.ready ? '' : ' secondary'}" data-action="publish" data-id="${escapeHtml(product.id)}" ${media.ready ? '' : 'disabled'} title="${escapeHtml(media.detail)}">Publish</button>`;
  const videoAction = product.media_asset_id && !media.ready
    ? '<a class="button secondary" href="#/seller/upload">Replace video</a>'
    : !product.media_asset_id ? '<a class="button secondary" href="#/seller/upload">Add video</a>' : '';
  return `<article class="seller-product-card" data-product-id="${escapeHtml(product.id)}">
    <div class="seller-product-card__top"><div><span class="seller-status seller-status--${escapeHtml(product.status || 'draft')}">${escapeHtml(statusLabel(product.status))}</span><h2>${escapeHtml(product.title || 'Untitled video')}</h2></div><strong class="seller-product-card__price">${escapeHtml(formatPrice(product))}</strong></div>
    <p class="seller-product-card__description">${escapeHtml(product.description || 'Add a description so buyers know what they are purchasing.')}</p>
    <div class="seller-product-card__meta"><span>${escapeHtml(media.label)}</span><span>${escapeHtml(media.detail)}</span><span>${published ? 'Visible in marketplace' : 'Not visible to buyers'}</span></div>
    <div class="seller-product-card__actions"><button class="button secondary" data-action="edit" data-id="${escapeHtml(product.id)}">Edit details</button>${videoAction}${publishAction}</div>
  </article>`;
}

function editorMarkup(product = null) {
  const editing = Boolean(product);
  return `<section class="seller-editor" aria-labelledby="seller-editor-title">
    <div class="seller-editor__heading"><div><p class="eyebrow">${editing ? 'Edit product' : 'New product'}</p><h2 id="seller-editor-title">${editing ? 'Product details' : 'Create a product'}</h2></div><button type="button" class="button secondary" data-editor-action="close">Cancel</button></div>
    <form id="seller-product-form" class="seller-form">
      <input type="hidden" name="id" value="${editing ? escapeHtml(product.id) : ''}">
      <label>Title<input name="title" type="text" maxlength="255" value="${escapeHtml(product?.title || '')}" placeholder="Give your video a clear title" required></label>
      <label>Description<textarea name="description" maxlength="5000" rows="6" placeholder="Explain what buyers will get and what makes this video useful.">${escapeHtml(product?.description || '')}</textarea></label>
      <div class="seller-form__row"><label>Price<input name="priceAmount" type="number" min="1" step="1" value="${escapeHtml(product?.price_amount ?? 1000)}" required></label><label>Currency<select name="priceCurrency"><option value="JPY" ${product?.price_currency === 'JPY' || !product ? 'selected' : ''}>JPY — Japanese Yen</option><option value="USD" ${product?.price_currency === 'USD' ? 'selected' : ''}>USD — US Dollar</option><option value="EUR" ${product?.price_currency === 'EUR' ? 'selected' : ''}>EUR — Euro</option></select></label></div>
      <p class="seller-form__hint">${editing ? 'Published products are locked. Unpublish the product before changing its details.' : 'You can upload the protected video separately, then attach it to this product.'}</p>
      <div class="seller-form__actions"><button class="button" type="submit">${editing ? 'Save changes' : 'Create product'}</button>${!editing ? '<a class="button secondary" href="#/seller/upload">Upload a video instead</a>' : ''}</div>
      <p id="seller-product-form-message" class="microcopy" aria-live="polite"></p>
    </form>
  </section>`;
}

export async function renderSellerProducts(root) {
  root.innerHTML = `<main class="seller-shell"><header class="seller-header"><div><p class="eyebrow">Creator workspace</p><h1>My videos</h1><p>Manage your catalog, prepare products and publish when everything is ready.</p></div><div class="hero-actions"><a class="button secondary" href="#/seller/upload">Upload video</a><button class="button" id="new-product">Create product</button></div></header><div id="seller-product-editor-root"></div><p id="seller-products-message" class="microcopy" aria-live="polite">Loading products…</p><section id="seller-products-list" class="seller-grid" aria-live="polite"></section></main>`;

  const message = root.querySelector('#seller-products-message');
  const list = root.querySelector('#seller-products-list');
  const editorRoot = root.querySelector('#seller-product-editor-root');

  function closeEditor() { editorRoot.innerHTML = ''; }

  function showEditor(product = null) {
    editorRoot.innerHTML = editorMarkup(product);
    editorRoot.querySelector('[data-editor-action="close"]')?.addEventListener('click', closeEditor);
    editorRoot.querySelector('input[name="title"]')?.focus();
    editorRoot.querySelector('#seller-product-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const formMessage = form.querySelector('#seller-product-form-message');
      const data = new FormData(form);
      const id = String(data.get('id') || '').trim();
      const title = String(data.get('title') || '').trim();
      const description = String(data.get('description') || '').trim();
      const priceAmount = Number(data.get('priceAmount'));
      const priceCurrency = String(data.get('priceCurrency') || 'JPY').toUpperCase();
      if (!title || !Number.isFinite(priceAmount) || priceAmount <= 0) { formMessage.textContent = 'Enter a title and a valid price.'; return; }
      const submit = form.querySelector('button[type="submit"]');
      submit.disabled = true;
      formMessage.textContent = 'Saving…';
      try {
        await request(id ? `/api/seller/products/${encodeURIComponent(id)}` : '/api/seller/products', { method: id ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, description, priceAmount, priceCurrency }) });
        closeEditor();
        await load();
      } catch (error) {
        formMessage.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to save product.';
        submit.disabled = false;
      }
    });
  }

  async function load() {
    message.textContent = 'Loading products…';
    try {
      const data = await request('/api/seller/products');
      const products = Array.isArray(data.products) ? data.products : [];
      list.innerHTML = products.length ? products.map(productRow).join('') : '<section class="empty-state"><h2>Your catalog is empty</h2><p>Create a product or upload a video to start building your storefront.</p><div class="hero-actions"><button class="button" data-empty-action="create">Create product</button><a class="button secondary" href="#/seller/upload">Upload video</a></div></section>';
      message.textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;
    } catch (error) {
      list.innerHTML = '<section class="error-state"><h2>Products could not be loaded</h2><p>Please try again. Your drafts are not affected.</p></section>';
      message.textContent = error.status === 401 ? 'Please sign in as a seller.' : 'Unable to load products.';
    }
  }

  root.querySelector('#new-product').addEventListener('click', () => showEditor());
  list.addEventListener('click', async (event) => {
    const emptyAction = event.target.closest('[data-empty-action]');
    if (emptyAction?.dataset.emptyAction === 'create') { showEditor(); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    try {
      if (action === 'edit') { const current = await request(`/api/seller/products/${encodeURIComponent(id)}`); showEditor(current.product); return; }
      button.disabled = true;
      await request(`/api/seller/products/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      await load();
    } catch (error) {
      message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to update product.';
      button.disabled = false;
    }
  });

  await load();
}
