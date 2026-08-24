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
    const payload = await loadCatalog({ locale, search: query, category, page: 1, limit: 24 });
    const products = payload.data || [];
    status.textContent = payload.source === 'api' ? `${products.length} results` : 'Preview data';
    results.innerHTML = products.length ? products.map((product) => `<button class="product-card product-card-button" data-product-id="${escapeHtml(product.id)}" type="button">
      <div class="product-thumb" aria-hidden="true"><span>▶</span></div><div class="product-body"><h3>${escapeHtml(product.title)}</h3><div class="product-meta">${escapeHtml(product.seller)} · ${escapeHtml(product.category || '')}</div><div class="product-price">${new Intl.NumberFormat(locale, { style: 'currency', currency: product.price_currency || product.currency || 'USD' }).format(Number(product.price_amount ?? product.price ?? 0))}</div></div></button>`).join('') : `<div class="empty-state">No products found.</div>`;
    results.querySelectorAll('[data-product-id]').forEach((button) => button.addEventListener('click', () => onNavigate(`/product/${encodeURIComponent(button.dataset.productId)}`)));
  } catch (error) {
    status.textContent = 'Unable to load';
    results.innerHTML = `<div class="error-state"><strong>Something went wrong.</strong><p>Please try again.</p></div>`;
  }

  root.querySelector('#catalog-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') onNavigate(`/browse?q=${encodeURIComponent(event.target.value)}${category ? `&category=${encodeURIComponent(category)}` : ''}`);
  });
  root.querySelector('#catalog-category').addEventListener('change', (event) => onNavigate(`/browse?category=${encodeURIComponent(event.target.value)}${query ? `&q=${encodeURIComponent(query)}` : ''}`));
}
