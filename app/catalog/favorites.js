const storageKey = 'video-marketplace-favorites';
const params = new URLSearchParams(window.location.search);
const requestedId = params.get('productId');
const grid = document.getElementById('favorite-items');
const message = document.getElementById('favorite-message');
const isProductId = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);

function readIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(storageKey) || '[]');
    return Array.isArray(ids) ? [...new Set(ids.filter((id) => typeof id === 'string' && id))] : [];
  } catch { return []; }
}

function saveIds(ids) {
  try {
    localStorage.setItem(storageKey, JSON.stringify([...new Set(ids)]));
    return true;
  } catch {
    message.textContent = 'お気に入りを保存できません。ブラウザーの保存設定をご確認ください。';
    return false;
  }
}

async function loadAndSyncFavorites() {
  try {
    const response = await fetch('/api/buyer/favorites', { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json();
    const merged = [...new Set([...readIds(), ...(Array.isArray(data.productIds) ? data.productIds : [])])];
    saveIds(merged);
    await saveServerFavorites(merged);
  } catch {}
}

async function saveServerFavorites(ids) {
  try {
    await fetch('/api/buyer/favorites', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ productIds: [...new Set(ids.filter(isProductId))] })
    });
  } catch {}
}

function make(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function price(product) {
  const amount = Number(product.price_amount);
  if (!Number.isFinite(amount)) return '—';
  return product.price_currency === 'JPY'
    ? '¥' + amount.toLocaleString('ja-JP')
    : amount.toLocaleString('ja-JP') + ' ' + (product.price_currency || '');
}

async function getProducts() {
  const all = [];
  let page = 1;
  let hasMore = true;
  while (hasMore && page <= 20) {
    const response = await fetch('/api/catalog/products?locale=ja&limit=50&page=' + page, {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('作品情報を取得できませんでした。');
    const result = await response.json();
    all.push(...(result.data || []));
    hasMore = Boolean(result.pagination?.hasMore);
    page += 1;
  }
  return all;
}

async function render() {
  let ids = readIds();
  if (requestedId && isProductId(requestedId) && !ids.includes(requestedId)) {
    ids = [...ids, requestedId];
    saveIds(ids);
    message.textContent = 'お気に入りに追加しました。';
    history.replaceState({}, '', '/pages/favorites.html');
  }
  await saveServerFavorites(ids);
  grid.replaceChildren();
  if (!ids.length) {
    grid.append(make('p', 'announcement-empty', 'お気に入りはまだありません。作品詳細からお気に入りを追加できます。'));
    return;
  }

  const products = await getProducts();
  const byId = new Map(products.map((product) => [String(product.id), product]));
  const favorites = ids.filter((id) => byId.has(id)).map((id) => byId.get(id));
  if (favorites.length !== ids.length) {
    ids = favorites.map((product) => String(product.id));
    saveIds(ids);
    await saveServerFavorites(ids);
  }
  if (!favorites.length) {
    grid.append(make('p', 'announcement-empty', '公開中のお気に入り作品はありません。'));
    return;
  }

  favorites.forEach((product) => {
    const card = make('article', 'library-card');
    const thumb = make('div', 'library-thumb');
    if (product.thumbnail_url) {
      const image = make('img');
      image.src = product.thumbnail_url;
      image.alt = product.title || '動画のサムネイル';
      image.loading = 'lazy';
      image.style.cssText = 'width:100%;height:100%;object-fit:cover';
      thumb.append(image);
    }
    const body = make('div', 'library-card-body');
    body.append(make('h2', '', product.title || '動画'));
    const meta = make('div', 'library-card-meta');
    meta.append(make('span', '', product.category || '動画'), make('span', '', price(product)));
    body.append(meta);
    const actions = make('div', 'library-card-actions');
    const view = make('a', 'library-watch', '作品を見る');
    view.href = '/pages/product-detail.html?productId=' + encodeURIComponent(product.id);
    const remove = make('button', 'library-link', 'お気に入りから削除');
    remove.type = 'button';
    remove.addEventListener('click', async () => {
      ids = readIds().filter((id) => id !== String(product.id));
      saveIds(ids);
      await saveServerFavorites(ids);
      render().catch(showError);
    });
    actions.append(view, remove);
    body.append(actions);
    card.append(thumb, body);
    grid.append(card);
  });
}

function showError() {
  grid.replaceChildren(make('p', 'announcement-empty', 'お気に入りを読み込めませんでした。時間をおいて再度お試しください。'));
}

await loadAndSyncFavorites();
render().catch(showError);
