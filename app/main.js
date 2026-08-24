import { getLocale, setLocale, t } from './i18n.js';

const app = document.querySelector('#app');

function render() {
  const locale = getLocale();
  app.innerHTML = `
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
    </header>
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
    </main>
  `;

  document.querySelector('#locale').addEventListener('change', (event) => {
    setLocale(event.target.value);
    render();
  });
}

render();
