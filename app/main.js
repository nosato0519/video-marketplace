import { getLocale, setLocale, t } from './i18n.js';
import { renderCatalog } from './catalog/catalog-view.js';
import { getProduct } from './catalog/catalog.js';
import { renderAuth } from './auth/auth-view.js';

const app = document.querySelector('#app');

function header(locale) {
  return `<header class="site-header"><a class="brand" href="#/">VIDEO MARKET</a><nav aria-label="Primary"><a href="#/browse">${t('nav.discover')}</a><a href="#/categories">${t('nav.categories')}</a><a href="#/popular">${t('nav.popular')}</a><a href="#/creators">${t('nav.creators')}</a></nav><div class="header-actions"><select id="locale" aria-label="Language"><option value="en" ${locale === 'en' ? 'selected' : ''}>EN</option><option value="ja" ${locale === 'ja' ? 'selected' : ''}>日本語</option><option value="es" ${locale === 'es' ? 'selected' : ''}>ES</option><option value="pt-BR" ${locale === 'pt-BR' ? 'selected' : ''}>PT</option><option value="fr" ${locale === 'fr' ? 'selected' : ''}>FR</option><option value="de" ${locale === 'de' ? 'selected' : ''}>DE</option><option value="it" ${locale === 'it' ? 'selected' : ''}>IT</option><option value="ko" ${locale === 'ko' ? 'selected' : ''}>한국어</option><option value="zh-CN" ${locale === 'zh-CN' ? 'selected' : ''}>简体中文</option><option value="zh-TW" ${locale === 'zh-TW' ? 'selected' : ''}>繁體中文</option></select><a href="#/login">${t('nav.login')}</a><a class="button" href="#/register">${t('nav.signup')}</a></div></header>`;
}

function wireLocale() {
  document.querySelector('#locale')?.addEventListener('change', (event) => { setLocale(event.target.value); render(); });
}

function renderHome() {
  const locale = getLocale();
  app.innerHTML = `${header(locale)}<main><section class="hero"><p class="eyebrow">${t('hero.eyebrow')}</p><h1>${t('hero.title')}</h1><p>${t('hero.description')}</p><div class="hero-actions"><a class="button" href="#/browse">${t('hero.explore')}</a><a class="button secondary" href="#/seller/register">${t('hero.creator')}</a></div></section><section class="trust-grid"><div><strong>For buyers</strong><span>Discover, purchase and access your library.</span></div><div><strong>For creators</strong><span>Publish, sell and track earnings.</span></div><div><strong>For operators</strong><span>Moderate and manage the marketplace.</span></div></section></main>`;
  wireLocale();
}

function renderProduct(id) {
  const locale = getLocale();
  const product = getProduct(id);
  app.innerHTML = `${header(locale)}<main class="product-detail-page">${product ? `<a class="back-link" href="#/browse">← ${t('nav.discover')}</a><section class="product-detail"><div class="product-detail-media"><div class="product-thumb large">VIDEO</div></div><div class="product-detail-copy"><p class="eyebrow">${product.category}</p><h1>${product.title}</h1><p class="seller-line">${product.seller}</p><p class="detail-description">Premium video product. Streaming and download availability are controlled by the product and operator policy.</p><div class="detail-purchase"><strong>${new Intl.NumberFormat(locale, { style: 'currency', currency: product.currency }).format(product.price)}</strong><button class="button" type="button" id="checkout">Purchase</button></div><p id="checkout-message" class="microcopy" aria-live="polite">Secure checkout integration is prepared as a provider-neutral boundary.</p></div></section>` : `<section class="empty-state"><h1>Product not found</h1><a class="button" href="#/browse">Back to catalog</a></section>`}</main>`;
  wireLocale();
  document.querySelector('#checkout')?.addEventListener('click', () => { location.hash = '#/login'; });
}

async function renderBrowse() {
  const locale = getLocale();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  app.innerHTML = header(locale) + '<main id="catalog-root"></main>';
  wireLocale();
  await renderCatalog({ root: document.querySelector('#catalog-root'), locale, t, query, category, onNavigate: (path) => { location.hash = `#${path}`; } });
}

function renderAuthPage(mode) {
  app.innerHTML = header(getLocale()) + '<div id="auth-root"></div>';
  wireLocale();
  renderAuth(document.querySelector('#auth-root'), mode);
}

function render() {
  const rawPath = location.hash.replace(/^#/, '').split('?')[0] || '/';
  const match = rawPath.match(/^\/product\/([^/]+)$/);
  if (match) return renderProduct(decodeURIComponent(match[1]));
  if (rawPath === '/browse' || rawPath === '/categories' || rawPath === '/popular') return renderBrowse();
  if (rawPath === '/login') return renderAuthPage('login');
  if (rawPath === '/register') return renderAuthPage('register');
  renderHome();
}

window.addEventListener('hashchange', render);
render();
