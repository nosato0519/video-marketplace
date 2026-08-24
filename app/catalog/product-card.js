export function renderProductCard(product, { locale = 'en', currency = 'USD' } = {}) {
  const article = document.createElement('article');
  article.className = 'product-card';
  article.setAttribute('data-product-id', product.id);

  const title = product.title || 'Untitled video';
  const seller = product.seller_name || 'Seller';
  const price = typeof product.price_minor === 'number'
    ? new Intl.NumberFormat(locale, { style: 'currency', currency }).format(product.price_minor / 100)
    : '';

  article.innerHTML = `
    <a class="product-card__link" href="#/product/${encodeURIComponent(product.id)}" aria-label="${escapeHtml(title)}">
      <div class="product-card__media" aria-hidden="true"></div>
      <div class="product-card__body">
        <h3 class="product-card__title"></h3>
        <p class="product-card__seller"></p>
        <div class="product-card__meta">
          <span class="product-card__price"></span>
          <span class="product-card__delivery"></span>
        </div>
      </div>
    </a>`;

  article.querySelector('.product-card__title').textContent = title;
  article.querySelector('.product-card__seller').textContent = seller;
  article.querySelector('.product-card__price').textContent = price;
  article.querySelector('.product-card__delivery').textContent = product.download_enabled ? 'Stream + download' : 'Streaming';
  return article;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;'
  }[char]));
}
