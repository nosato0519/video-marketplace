import { getLocale, t } from '../i18n.js';

function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function renderProductDetail(product) {
  const locale = getLocale();
  if (!product) {
    return `<section class="detail-empty" role="alert"><h1>${escapeHtml(t('product.notFound'))}</h1><a class="button" href="#/browse">${escapeHtml(t('nav.discover'))}</a></section>`;
  }

  const price = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: product.currency || 'USD'
  }).format(product.price || 0);

  const delivery = product.downloadEnabled ? t('product.streamingAndDownload') : t('product.streamingOnly');

  return `<main class="product-detail">
    <a class="back-link" href="#/browse">← ${escapeHtml(t('nav.discover'))}</a>
    <div class="detail-grid">
      <section class="detail-media" aria-label="${escapeHtml(product.title)}">
        <div class="detail-preview">PREVIEW</div>
      </section>
      <section class="detail-copy">
        <p class="eyebrow">${escapeHtml(product.category)}</p>
        <h1>${escapeHtml(product.title)}</h1>
        <p class="seller-line">${escapeHtml(product.seller)}</p>
        <p class="detail-description">${escapeHtml(product.description || '')}</p>
        <dl class="detail-facts">
          <div><dt>${escapeHtml(t('product.delivery'))}</dt><dd>${escapeHtml(delivery)}</dd></div>
          <div><dt>${escapeHtml(t('product.language'))}</dt><dd>${escapeHtml(product.language || 'English')}</dd></div>
        </dl>
        <div class="purchase-panel">
          <strong class="detail-price">${price}</strong>
          <a class="button purchase-button" href="#/checkout/${encodeURIComponent(product.id)}">${escapeHtml(t('product.buyNow'))}</a>
          <p class="purchase-note">${escapeHtml(t('product.securePurchase'))}</p>
        </div>
      </section>
    </div>
  </main>`;
}
