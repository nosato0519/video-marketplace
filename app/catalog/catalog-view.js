import { loadCatalog, demoCategories } from './catalog-data.js';

const escapeHtml = (value = '') => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;');

export async function renderCatalog({ root, locale, t, query = '', category = '', onNavigate }) {
  root.innerHTML = `<section class="catalog-page"><div class="catalog-heading"><div><p class="eyebrow">${t('hero.eyebrow')}</p><h1>${t('nav.discover')}</h1></div><div id="catalog-status" class="catalog-status" aria-live="polite">Loading…</div></div>
    <div class="catalog-toolbar"><label class="search-field"><span class="sr-only">${t('search.placeholder')}</span><input id="catalog-search" value="${escapeHtml(query)}" placeholder="${t('search.placeholder')}"></label>
    <select id="catalog-category" aria-label="${t('nav.categories')}"><option value="">${t('nav.categories')}</option>${demoCategories().map((item) => `<option value="${escapeHtml(item)}" ${item === category ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select></div>
    <div id="catalog-results" class="product-grid" aria-live="polite"></div></section>`;

  const results = root.querySelector('#catalog-results');
  const status = root.querySelector('#catalog-status');
  try {
    // The real application must render the backend catalog only. Demo fixture
    // fallback remains available to the lightweight demo harness, but must not
    // silently make the production storefront look healthy when the API fails.
    const payload = await loadCatalog({ locale, search: query, category, page: 1, limit: 24, allowFallback: false });
    const products = payload.data || [];
    status.textContent = `${products.length} results`;
    results.innerHTML = products.length ? products.map((product) => `<button class="product-card product-card-button" data-product-id="${escapeHtml(product.id)}" type="button">
      <div class="product-thumb" aria-hidden="true"><span>▶</span></div><div class="product-body"><h3>${escapeHtml(product.title)}</h3><div class="product-meta">${escapeHtml(product.seller)} · ${escapeHtml(product.category || '')}</div><div class="product-price">${new Intl.NumberFormat(locale, { style: 'currency', currency: product.price_currency || product.currency || 'USD' }).format(Number(product.price_amount ?? product.price ?? 0))}</div></div></button>`).join('') : `<div class="empty-state"><h2>No videos found</h2><p>Try a different search or category.</p></div>`;
    results.querySelectorAll('[data-product-id]').forEach((button) => button.addEventListener('click', () => onNavigate(`/product/${encodeURIComponent(button.dataset.productId)}`)));
  } catch (error) {
    status.textContent = 'Unable to load';
    results.innerHTML = `<div class="error-state"><strong>Catalog is temporarily unavailable.</strong><p>We could not reach the marketplace catalog. Please try again.</p><button class="button secondary" id="catalog-retry" type="button">Retry</button></div>`;
    root.querySelector('#catalog-retry')?.addEventListener('click', () => renderCatalog({ root, locale, t, query, category, onNavigate }));
  }

  root.querySelector('#catalog-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onNavigate(`/browse?q=${encodeURIComponent(event.target.value)}${category ? `&category=${encodeURIComponent(category)}` : ''}`);
  });
  root.querySelector('#catalog-category').addEventListener('change', (event) => onNavigate(`/browse?category=${encodeURIComponent(event.target.value)}${query ? `&q=${encodeURIComponent(query)}` : ''}`));
}
