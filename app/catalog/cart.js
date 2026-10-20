const CART_KEY = 'video-marketplace-cart';
const params = new URLSearchParams(window.location.search);
const requestedProductId = params.get('productId');
const itemsNode = document.getElementById('cart-items');
const countNode = document.getElementById('cart-item-count');
const summaryCount = document.getElementById('cart-summary-count');
const totalNode = document.getElementById('cart-total');
const clearButton = document.getElementById('cart-clear');
const checkoutButton = document.getElementById('cart-checkout');
const message = document.getElementById('cart-message');
const isProductId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function readCart() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(saved) ? [...new Set(saved.filter((id) => typeof id === 'string' && id.length > 0))] : [];
  } catch {
    return [];
  }
}

function saveCart(ids) {
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(ids));
    return true;
  } catch {
    message.textContent = 'ブラウザーにカートを保存できません。ブラウザーの保存設定をご確認ください。';
    return false;
  }
}

async function saveServerCart(ids) {
  try {
    await fetch('/api/buyer/cart', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ productIds: [...new Set(ids.filter(isProductId))] })
    });
  } catch {}
}

async function initializeCart() {
  try {
    const response = await fetch('/api/buyer/cart', { credentials: 'same-origin', cache: 'no-store' });
    if (response.ok) {
      const result = await response.json();
      const merged = [...new Set([...readCart(), ...(Array.isArray(result.productIds) ? result.productIds : [])])];
      saveCart(merged);
      await saveServerCart(merged);
    }
  } catch {}
}

function formatPrice(amount, currency) {
  const value = Number(amount);
  if (!Number.isFinite(value)) return '—';
  return currency === 'JPY'
    ? '¥' + value.toLocaleString('ja-JP')
    : value.toLocaleString('ja-JP') + ' ' + (currency || '');
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function loadProduct(id) {
  const response = await fetch('/api/catalog/products/' + encodeURIComponent(id) + '?locale=ja', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' }
  });
  if (!response.ok) throw new Error('作品情報を取得できませんでした。');
  const payload = await response.json();
  if (!payload.data) throw new Error('作品が見つかりません。');
  return payload.data;
}

async function renderCart() {
  const ids = readCart();
  itemsNode.replaceChildren();
  countNode.textContent = ids.length + '作品';
  summaryCount.textContent = String(ids.length);
  checkoutButton.disabled = ids.length === 0;
  clearButton.disabled = ids.length === 0;

  if (!ids.length) {
    itemsNode.append(element('p', 'announcement-empty', 'カートに作品はありません。動画一覧から作品を追加してください。'));
    totalNode.textContent = '—';
    return;
  }

  const products = [];
  for (const id of ids) {
    try {
      products.push(await loadProduct(id));
    } catch {
      const remaining = readCart().filter((itemId) => itemId !== id);
      saveCart(remaining);
    }
  }

  if (products.length !== ids.length) {
    message.textContent = '公開が終了した作品をカートから除外しました。';
    await saveServerCart(readCart());
    return renderCart();
  }

  products.forEach((product) => {
    const card = element('article', 'buyer-history-card');
    const thumbnail = element('div', 'library-thumb');
    const image = product.images?.find((item) => item.role === 'thumbnail') || product.images?.[0];
    if (image?.url) {
      thumbnail.style.backgroundImage = 'url("' + image.url + '")';
      thumbnail.style.backgroundSize = 'cover';
      thumbnail.style.backgroundPosition = 'center';
    }
    const info = element('div', 'buyer-history-info');
    info.append(element('strong', '', product.title || '動画'));
    info.append(element('span', '', product.seller ? '販売者：' + product.seller : '動画作品'));
    info.append(element('small', '', formatPrice(product.price_amount, product.price_currency)));

    const actions = element('div', 'cart-item-actions');
    const checkoutLink = element('a', 'cart-view-link', 'この作品を購入 →');
    checkoutLink.href = '/pages/checkout.html?productId=' + encodeURIComponent(product.id);
    const remove = element('button', 'cart-remove-link', '削除');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      const ids = readCart().filter((id) => id !== product.id);
      saveCart(ids);
      await saveServerCart(ids);
      renderCart();
    });
    actions.append(checkoutLink, remove);
    card.append(thumbnail, info, actions);
    itemsNode.append(card);
  });

  const currencies = new Set(products.map((product) => product.price_currency));
  totalNode.textContent = currencies.size === 1
    ? formatPrice(products.reduce((sum, product) => sum + Number(product.price_amount), 0), products[0].price_currency)
    : '複数通貨';
  checkoutButton.disabled = false;
}

if (requestedProductId) {
  const ids = readCart();
  if (!ids.includes(requestedProductId)) ids.push(requestedProductId);
  saveCart(ids);
  window.history.replaceState({}, '', '/pages/cart.html');
}

clearButton.addEventListener('click', async () => {
  saveCart([]);
  await saveServerCart([]);
  message.textContent = 'カートを空にしました。';
  renderCart();
});

checkoutButton.addEventListener('click', () => {
  const ids = readCart();
  if (ids.length === 1) {
    window.location.assign('/pages/checkout.html?productId=' + encodeURIComponent(ids[0]));
    return;
  }
  message.textContent = '現在は一作品ずつ購入手続きに進みます。購入する作品の「この作品を購入」を選択してください。';
});

initializeCart().then(() => {
  if (requestedProductId) saveServerCart(readCart());
  return renderCart();
}).catch(() => {
  itemsNode.replaceChildren(element('p', 'announcement-empty', 'カートを読み込めませんでした。時間をおいて再度お試しください。'));
});
