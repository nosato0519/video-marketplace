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
    const filename = product.media_original_filename || 'Protected video';
    const size = formatBytes(product.media_byte_size);
    return { label: 'Video ready', detail: `${filename}${size ? ` · ${size}` : ''}`, ready: true };
  }
  if (status === 'processing') return { label: 'Video processing', detail: 'Wait until validation finishes before publishing.', ready: false };
  if (status === 'deleted') return { label: 'Video unavailable', detail: 'Choose another uploaded video before publishing.', ready: false };
  return { label: 'Video unavailable', detail: 'Check the uploaded media before publishing.', ready: false };
}

function statusLabel(status) {
  const labels = { draft: 'Draft', processing: 'Processing', submitted: 'Submitted', under_review: 'Under review', approved: 'Approved', published: 'Published' };
  return labels[status] || String(status || 'Draft');
}

function productRow(product) {
  const published = product.status === 'published';
  const media = mediaSummary(product);
  const editAction = published
    ? '<button class="button secondary" disabled title="Unpublish this product before editing.">Edit details</button>'
    : `<a class="button secondary" href="/seller/product-edit.html?productId=${encodeURIComponent(product.id)}">Edit details</a>`;
  const submitAction = ['draft', 'rejected'].includes(product.status)
    ? `<button class="button secondary" data-action="submit" data-id="${escapeHtml(product.id)}">${product.status === 'rejected' || product.moderation_status === 'changes_requested' ? '修正して再申請' : '審査を申請'}</button>`
    : '';
  const publishAction = published
    ? `<button class="button secondary" data-action="unpublish" data-id="${escapeHtml(product.id)}">Unpublish</button>`
    : product.status === 'approved'
      ? `<button class="button${media.ready ? '' : ' secondary'}" data-action="publish" data-id="${escapeHtml(product.id)}" ${media.ready ? '' : 'disabled'} title="${escapeHtml(media.detail)}">Publish</button>`
      : '';
  const deleteAction = product.status === 'draft' ? `<button class="button secondary" data-action="delete" data-id="${escapeHtml(product.id)}">Delete draft</button>` : '';
  return `<article class="seller-product-card" data-product-id="${escapeHtml(product.id)}">
    <div class="seller-product-card__top"><div><span class="seller-status seller-status--${escapeHtml(product.status || 'draft')}">${escapeHtml(statusLabel(product.status))}</span><h2>${escapeHtml(product.title || 'Untitled video')}</h2></div><strong class="seller-product-card__price">${escapeHtml(formatPrice(product))}</strong></div>
    <p class="seller-product-card__description">${escapeHtml(product.description || 'Add a description so buyers know what they are purchasing.')}</p>
    <div class="seller-product-card__meta"><span>${escapeHtml(media.label)}</span><span>${escapeHtml(media.detail)}</span><span>${published ? 'Visible in marketplace' : 'Not visible to buyers'}</span></div>
    <div class="seller-product-card__actions">${editAction}${submitAction}${publishAction}${deleteAction}</div>
  </article>`;
}

export async function renderSellerProducts(root) {
  root.innerHTML = `<main class="seller-shell"><header class="seller-header"><div><p class="eyebrow">Creator workspace</p><h1>My videos</h1><p>Manage your catalog, prepare products and publish when everything is ready.</p></div><div class="hero-actions"><a class="button" href="/seller/product-editor.html">Create product</a></div></header><p id="seller-products-message" class="microcopy" aria-live="polite">Loading products…</p><section id="seller-products-list" class="seller-grid" aria-live="polite"></section></main>`;

  const message = root.querySelector('#seller-products-message');
  const list = root.querySelector('#seller-products-list');

  async function load() {
    message.textContent = 'Loading products…';
    try {
      const data = await request('/api/seller/products');
      const products = Array.isArray(data.products) ? data.products : [];
      list.innerHTML = products.length
        ? products.map(productRow).join('')
        : '<section class="empty-state"><h2>Your catalog is empty</h2><p>Register a video with its required thumbnail to create your first product.</p><a class="button" href="/seller/product-editor.html">Create your first product</a></section>';
      message.textContent = `${products.length} ${products.length === 1 ? 'product' : 'products'}`;
    } catch (error) {
      list.innerHTML = '<section class="error-state"><h2>Products could not be loaded</h2><p>Please try again. Your drafts are not affected.</p></section>';
      if (error.status === 401 || error.status === 403) {
        window.location.href = '/pages/seller-login.html';
        return;
      }
      message.textContent = 'Unable to load products.';
    }
  }

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const id = button.dataset.id;
    const action = button.dataset.action;
    if (action === 'delete' && !window.confirm('Delete this draft? Products with purchase history cannot be deleted.')) return;
    button.disabled = true;
    try {
      if (action === 'delete') {
        await request(`/api/seller/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
      } else {
        await request(`/api/seller/products/${encodeURIComponent(id)}/${action}`, { method: 'POST' });
      }
      await load();
    } catch (error) {
      message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to update product.';
      button.disabled = false;
    }
  });

  await load();
}

export function initSellerProductsPage() {
  const list = document.querySelector('#seller-product-list');
  const pagination = document.querySelector('.seller-pagination');
  const unusedMediaList = document.querySelector('#seller-unused-media-list');
  if (!list || !pagination || !unusedMediaList) return;

  const escape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  async function loadUnusedMedia() {
    const response = await fetch('/api/seller/media/assets', { credentials: 'same-origin' });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const error = new Error(body?.error?.message || body?.error || '動画ファイルを取得できませんでした。');
      error.status = response.status;
      throw error;
    }
    const unused = (Array.isArray(body?.mediaAssets) ? body.mediaAssets : []).filter((asset) => !asset.in_use);
    unusedMediaList.innerHTML = unused.length ? unused.map((asset) => {
      const retrying = String(asset.status || '').toLowerCase() === 'deleted';
      return `<div class="seller-video-row"><div class="seller-video-info"><strong>${escape(asset.original_filename || '名称なし')}</strong><small>${escape(asset.mime_type || '')}　${(Number(asset.byte_size || 0) / (1024 * 1024)).toFixed(1)} MB　${new Date(asset.created_at).toLocaleDateString('ja-JP').replaceAll('/', '.')}</small></div><span class="seller-video-status is-draft">${retrying ? '削除待ち' : '未使用'}</span><div class="seller-video-actions"><button type="button" class="seller-video-edit" data-delete-media="${escape(asset.id)}" data-retry-delete="${retrying ? 'true' : 'false'}">${retrying ? '削除を再試行' : '動画ファイルを削除'}</button></div></div>`;
    }).join('') : '<small>削除できる未使用の動画ファイルはありません。</small>';
  }

  unusedMediaList.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-delete-media]');
    if (!button || button.disabled) return;
    const assetId = button.dataset.deleteMedia;
    const retrying = button.dataset.retryDelete === 'true';
    if (!window.confirm(retrying ? '削除に失敗した動画ファイルの削除を再試行しますか？' : 'この未使用の動画ファイルを完全に削除しますか？')) return;
    button.disabled = true;
    try {
      const response = await fetch(`/api/seller/media/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE', credentials: 'same-origin' });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(body?.error?.message || body?.error || '動画ファイルを削除できませんでした。');
        error.status = response.status;
        throw error;
      }
      await loadUnusedMedia();
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        window.location.href = '/pages/seller-login.html';
        return;
      }
      if (error.status === 409 || error.message === 'media_asset_in_use') {
        window.alert('作品に登録済みの動画は削除できません。動画一覧を再読み込みします。');
        await loadUnusedMedia().catch(() => {});
        return;
      }
      window.alert(error.message || '動画ファイルを削除できませんでした。');
      button.disabled = false;
    }
  });

  const labels = { published: '公開中', submitted: '申請中', under_review: '審査中', processing: '処理中', approved: '承認済み', draft: '下書き', rejected: '却下' };
  const classes = { published: 'is-published', submitted: 'is-pending', under_review: 'is-pending', processing: 'is-pending', approved: 'is-published', draft: 'is-draft', rejected: 'is-rejected' };
  const pageSize = 10;

  function renderPagination(meta) {
    const totalPages = Math.max(1, Number(meta?.total_pages || 1));
    const current = Math.min(Math.max(1, Number(meta?.page || 1)), totalPages);
    const links = [];
    for (let page = 1; page <= totalPages; page += 1) {
      links.push(`<a href="?page=${page}" data-page="${page}" class="${page === current ? 'is-current' : ''}" aria-current="${page === current ? 'page' : 'false'}">${page}</a>`);
    }
    if (totalPages > 1 && current < totalPages) links.push(`<a href="?page=${current + 1}" data-page="${current + 1}">次へ →</a>`);
    pagination.innerHTML = links.join('');
  }

  async function load(page = 1) {
    const response = await fetch(`/api/seller/products?page=${page}&per_page=${pageSize}`, { credentials: 'same-origin' });
    const body = await response.json().catch(() => null);
    if (!response.ok) { const error = new Error(body?.error || '動画情報を取得できませんでした。'); error.status = response.status; throw error; }
    const products = Array.isArray(body?.products) ? body.products : [];
    const counts = body?.counts || {};
    document.querySelector('#product-count').textContent = Number(counts.total || 0).toLocaleString('ja-JP');
    document.querySelector('#published-count').textContent = Number(counts.published || 0).toLocaleString('ja-JP');
    document.querySelector('#review-count').textContent = Number(counts.review || 0).toLocaleString('ja-JP');
    document.querySelector('#draft-count').textContent = Number(counts.draft || 0).toLocaleString('ja-JP');
    list.innerHTML = products.length ? products.map((product) => `<div class="seller-video-row"><div class="seller-video-info"><strong>${escape(product.title || '無題の動画')}</strong><small>¥${Number(product.price_amount || 0).toLocaleString('ja-JP')}　${escape(labels[product.status] || product.status || '')}　${new Date(product.created_at).toLocaleDateString('ja-JP').replaceAll('/', '.')}</small></div><span class="seller-video-status ${classes[product.status] || 'is-draft'}">${escape(labels[product.status] || product.status || '')}</span><div class="seller-video-actions"><a href="/seller/product-edit.html?productId=${encodeURIComponent(product.id)}" class="seller-video-edit">編集</a>${['draft','rejected'].includes(product.status) ? `<button type="button" class="seller-video-edit" data-submit-product="${escape(product.id)}">${product.status === 'rejected' || product.moderation_status === 'changes_requested' ? '修正して再申請' : '審査を申請'}</button>` : ''}${product.status === 'approved' ? `<button type="button" class="seller-video-edit" data-publish-product="${escape(product.id)}">公開する</button>` : ''}${product.status === 'draft' ? `<button type="button" class="seller-video-edit" data-delete-product="${escape(product.id)}">下書きを削除</button>` : ''}</div></div>`).join('') : '<small>登録されている動画はありません。</small>';
    renderPagination(body?.pagination);
  }

  list.addEventListener('click', async (event) => {
    const submitButton = event.target.closest('[data-submit-product]');
    const publishButton = event.target.closest('[data-publish-product]');
    if (submitButton && !submitButton.disabled) {
      submitButton.disabled = true;
      try {
        const response = await fetch(`/api/seller/products/${encodeURIComponent(submitButton.dataset.submitProduct)}/submit`, {
          method: 'POST',
          credentials: 'same-origin',
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || body?.error || '審査を申請できませんでした。');
        await load(1);
      } catch (error) {
        window.alert(error.message || '審査を申請できませんでした。');
        submitButton.disabled = false;
      }
      return;
    }
    if (publishButton && !publishButton.disabled) {
      publishButton.disabled = true;
      try {
        const response = await fetch(`/api/seller/products/${encodeURIComponent(publishButton.dataset.publishProduct)}/publish`, {
          method: 'POST',
          credentials: 'same-origin',
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) throw new Error(body?.error?.message || body?.error || '公開できませんでした。');
        await load(1);
      } catch (error) {
        window.alert(error.message || '公開できませんでした。');
        publishButton.disabled = false;
      }
      return;
    }
    const button = event.target.closest('[data-delete-product]');
    if (!button || button.disabled) return;
    const productId = button.dataset.deleteProduct;
    if (!window.confirm('この下書きを削除しますか？購入履歴がある作品は削除できません。')) return;
    button.disabled = true;
    try {
      const response = await fetch(`/api/seller/products/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const error = new Error(body?.error?.message || body?.error || '下書きを削除できませんでした。');
        error.status = response.status;
        throw error;
      }
      await load(1);
    } catch (error) {
      if (error.status === 401 || error.status === 403) {
        window.location.href = '/pages/seller-login.html';
        return;
      }
      if (error.message === 'product_has_purchase_history') {
        window.alert('購入履歴がある作品は削除できません。');
      } else if (error.message === 'published_product_locked') {
        window.alert('公開中の作品は削除できません。先に公開を停止してください。');
      } else {
        window.alert(error.message || '下書きを削除できませんでした。');
      }
      button.disabled = false;
    }
  });
  pagination.addEventListener('click', (event) => {
    const link = event.target.closest('[data-page]');
    if (!link) return;
    event.preventDefault();
    const page = Number(link.dataset.page);
    history.replaceState(null, '', `?page=${page}`);
    load(page).catch((error) => { if (error.status === 401 || error.status === 403) window.location.href = '/pages/seller-login.html'; });
  });

  const initialPage = Math.max(1, Number.parseInt(new URLSearchParams(window.location.search).get('page'), 10) || 1);
  load(initialPage).catch((error) => { if (error.status === 401 || error.status === 403) window.location.href = '/pages/seller-login.html'; });
  loadUnusedMedia().catch(() => { unusedMediaList.innerHTML = '<small>未使用の動画ファイルを読み込めませんでした。</small>'; });
}

if (document.querySelector('#seller-product-list')) initSellerProductsPage();
