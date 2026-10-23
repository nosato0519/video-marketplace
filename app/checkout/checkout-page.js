import { checkoutApi } from '/app/checkout/checkout-api.js';

const params = new URLSearchParams(window.location.search);
const productId = params.get('productId');
const items = document.getElementById('checkout-order-items');
const count = document.getElementById('checkout-item-count');
const summaryCount = document.getElementById('checkout-summary-count');
const subtotal = document.getElementById('checkout-subtotal');
const total = document.getElementById('checkout-total');
const message = document.getElementById('checkout-message');
const submit = document.getElementById('checkout-submit');
let product;

function formatPrice(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return currency === 'JPY'
    ? '¥' + value.toLocaleString('ja-JP')
    : value.toLocaleString('ja-JP') + ' ' + (currency || '');
}

function showError(text) {
  items.textContent = text;
  message.textContent = text;
  submit.disabled = true;
}

if (!productId) {
  showError('購入する作品が指定されていません。動画一覧から作品を選んでください。');
} else {
  try {
    const response = await fetch('/api/catalog/products/' + encodeURIComponent(productId) + '?locale=ja', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (response.status === 401) {
      window.location.assign('/pages/buyer-login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search));
    } else if (!response.ok) {
      throw new Error('作品情報を取得できませんでした。');
    } else {
      const payload = await response.json();
      product = payload.data;
      if (!product) throw new Error('作品が見つかりません。');
      const article = document.createElement('article');
      article.className = 'buyer-history-card';
      const thumbnail = document.createElement('div');
      thumbnail.className = 'library-thumb';
      const thumbnailUrl = product.thumbnail_url || product.images?.find((image) => image.role === 'thumbnail')?.url;
      if (thumbnailUrl) {
        thumbnail.style.backgroundImage = 'url("' + thumbnailUrl + '")';
        thumbnail.style.backgroundSize = 'cover';
        thumbnail.style.backgroundPosition = 'center';
      }
      const info = document.createElement('div');
      info.className = 'buyer-history-info';
      const title = document.createElement('strong');
      title.textContent = product.title || '動画';
      const description = document.createElement('span');
      description.textContent = product.seller ? '販売者：' + product.seller : '動画作品';
      const price = document.createElement('small');
      price.textContent = formatPrice(product.price_amount, product.price_currency);
      info.append(title, description, price);
      const detail = document.createElement('a');
      detail.className = 'cart-view-link';
      detail.href = '/pages/product-detail.html?productId=' + encodeURIComponent(productId);
      detail.textContent = '作品を見る →';
      article.append(thumbnail, info, detail);
      items.replaceChildren(article);
      const formattedPrice = formatPrice(product.price_amount, product.price_currency);
      count.textContent = '1作品';
      summaryCount.textContent = '1';
      subtotal.textContent = formattedPrice;
      total.textContent = formattedPrice;
      submit.disabled = false;
    }
  } catch (error) {
    showError(error.message || '作品情報を読み込めませんでした。');
  }
}

submit.addEventListener('click', async () => {
  if (!productId || !product || submit.disabled) return;
  submit.disabled = true;
  message.textContent = '購入手続きを開始しています…';
  try {
    const intent = await checkoutApi.purchaseIntent(productId, 'ja');
    if (String(intent.data?.productId) !== String(productId)) {
      throw new Error('購入対象の作品IDが一致しません。決済を開始していません。');
    }

    const order = await checkoutApi.createOrder(productId);
    if (
      String(order.order?.product_id) !== String(productId)
      || !order.order?.id
    ) {
      throw new Error('注文の商品が選択した作品と一致しません。決済を開始していません。');
    }

    const result = await checkoutApi.checkout(order.order.id);
    if (!result.session?.url) throw new Error('決済画面のURLを取得できませんでした。');
    window.location.assign(result.session.url);
  } catch (error) {
    if (error.status === 401) {
      window.location.assign('/pages/buyer-login.html?next=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    message.textContent = error.body?.error?.message || error.message || '購入手続きを開始できませんでした。';
    submit.disabled = false;
  }
});
