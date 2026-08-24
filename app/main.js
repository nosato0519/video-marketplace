import { getLocale, setLocale, t } from './i18n.js';
import { listProducts, getCategories } from './catalog/catalog.js';

const app = document.querySelector('#app');

function header(locale) {
  return `
    <header class="site-header">
      <a class="brand" href="#/">VIDEO MARKET</a>
      <nav aria-label="Primary">
        <a href="#/browse">${t('nav.discover')}</a>
        <a href="#/categories">${t('nav.categories')}</a>
        <a href="#/popular">${t('nav.popular')}</a>
        <a href="#/creators">${t('nav.creators')}</a>
      </nav>
      <div class="header-actions">
        <select id="locale" aria-label="Language">
          <option value="en" ${locale === 'en' ? 'selected' : ''}>EN</option>
          <option value="ja" ${locale === 'ja' ? 'selected' : ''}>日本語</option>
          <option value="es" ${locale === 'es' ? 'selected' : ''}>ES</option>
          <option value="pt-BR" ${locale === 'pt-BR' ? 'selected' : ''}>PT</option>
          <option value="fr" ${locale === 'fr' ? 'selected' : ''}>FR</option>
          <option value="de" ${locale === 'de' ? 'selected' : ''}>DE</option>
          <option value="it" ${locale === 'it' ? 'selected' : ''}>IT</option>
          <option value="ko" ${locale === 'ko' ? 'selected' : ''}>한국어</option>
          <option value="zh-CN" ${locale === 'zh-CN' ? 'selected' : ''}>简体中文</option>
          <option value="zh-TW" ${locale === 'zh-TW' ? 'selected' : ''}>繁體中文</option>
        </select>
        <a href="#/login">${t('nav.login')}</a>
        <a class="button" href="#/register">${t('nav.signup')}</a>
      </div>
    </header>`;
}

function wireLocale() {
  document.querySelector('#locale')?.addEventListener('change', (event) => {
    setLocale(event.target.value);
    render();
  });
}

function renderHome() {
  const locale = getLocale();
  app.innerHTML = `${header(locale)}
    <main>
      <section class="hero">
        <p class="eyebrow">${t('hero.eyebrow')}</p>
        <h1>${t('hero.title')}</h1>
        <p>${t('hero.description')}</p>
        <div class="hero-actions">
          <a class="button" href="#/browse">${t('hero.explore')}</a>
          <a class="button secondary" href="#/seller/register">${t('hero.creator')}</a>
        </div>
      </section>
      <section class="status">
        <div><strong>Application shell</strong><span>Routing and localization foundation</span></div>
        <div><strong>Locale</strong><span>${locale}</span></div>
        <div><strong>Next</strong><span>Catalog, accounts and data model</span></div>
      </section>
    </main>`;
  wireLocale();
}

function renderBrowse() {
  const locale = getLocale();
  const params = new URLSearchParams(location.hash.split('?')[1] || '');
  const query = params.get('q') || '';
  const category = params.get('category') || '';
  const products = listProducts({ query, category });
  const categories = getCategories();

  app.innerHTML = `${header(locale)}
    <main class="catalog-page">
      <p class="eyebrow">${t('hero.eyebrow')}</p>
      <h1>${t('nav.discover')}</h1>
      <div class="catalog-toolbar">
        <input id="catalog-search" value="${query.replaceAll('"', '&quot;')}" placeholder="${t('search.placeholder')}" aria-label="${t('search.placeholder')}">
        <select id="catalog-category" aria-label="${t('nav.categories')}">
          <option value="">${t('nav.categories')}</option>
          ${categories.map((item) => `<option value="${item}" ${item === category ? 'selected' : ''}>${item}</option>`).join('')}
        </select>
      </div>
      ${products.length ? `<div class="product-grid">${products.map((product) => `
        <article class="product-card">
          <div class="product-thumb">VIDEO</div>
          <div class="product-body">
            <h3>${product.title}</h3>
            <div class="product-meta">${product.seller} · ${product.category}</div>
            <div class="product-price">${new Intl.NumberFormat(locale, { style: 'currency', currency: product.currency }).format(product.price)}</div>
          </div>
        </article>`).join('')}</div>` : `<div class="empty-state">No products found.</div>`}
    </main>`;

  wireLocale();
  document.querySelector('#catalog-search')?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      location.hash = `#/browse?q=${encodeURIComponent(event.target.value)}${category ? `&category=${encodeURIComponent(category)}` : ''}`;
    }
  });
  document.querySelector('#catalog-category')?.addEventListener('change', (event) => {
    location.hash = `#/browse?category=${encodeURIComponent(event.target.value)}${query ? `&q=${encodeURIComponent(query)}` : ''}`;
  });
}

function render() {
  const path = location.hash.replace(/^#/, '').split('?')[0] || '/';
  if (path === '/browse' || path === '/categories' || path === '/popular') renderBrowse();
  else renderHome();
}

window.addEventListener('hashchange', render);
render();
