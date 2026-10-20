const favoriteTable = document.getElementById('favorite-table');
const cartTable = document.getElementById('cart-table');
const favoriteSearch = document.getElementById('favorite-search');
const cartSearch = document.getElementById('cart-search');
const cartCount = document.getElementById('cart-count');

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('ja-JP');
}

function cell(text) {
  const node = document.createElement('td');
  node.textContent = text;
  return node;
}

function emptyRow(table, message) {
  const row = document.createElement('tr');
  const item = cell(message);
  item.colSpan = 4;
  row.append(item);
  table.tBodies[0].replaceChildren(row);
}

function renderRows(table, items, keyword, kind) {
  const filtered = items.filter((item) =>
    `${item.title || ''} ${item.email || ''}`.toLocaleLowerCase().includes(keyword)
  );
  if (!filtered.length) {
    emptyRow(table, keyword ? '検索条件に一致するデータはありません。' : '登録データはありません。');
    return filtered.length;
  }

  const rows = filtered.map((item) => {
    const row = document.createElement('tr');
    const titleCell = document.createElement('td');
    const title = document.createElement('strong');
    title.textContent = item.title || '作品';
    const id = document.createElement('small');
    id.textContent = item.productId || '';
    titleCell.append(title, id);
    const state = document.createElement('td');
    const tag = document.createElement('span');
    tag.className = 'tag ok';
    tag.textContent = kind === 'favorite' ? '登録中' : 'カート内';
    state.append(tag);
    row.append(titleCell, cell(item.email || ''), cell(formatDate(item.createdAt)), state);
    return row;
  });
  table.tBodies[0].replaceChildren(...rows);
  return filtered.length;
}

async function loadBuyerActivity() {
  emptyRow(favoriteTable, '読み込み中…');
  emptyRow(cartTable, '読み込み中…');
  try {
    const response = await fetch('/api/admin/buyer-activity', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || '購入者の利用情報を取得できませんでした。');
    const favorites = Array.isArray(result.favorites) ? result.favorites : [];
    const cart = Array.isArray(result.cart) ? result.cart : [];
    const render = () => {
      renderRows(favoriteTable, favorites, favoriteSearch.value.trim().toLocaleLowerCase(), 'favorite');
      const count = renderRows(cartTable, cart, cartSearch.value.trim().toLocaleLowerCase(), 'cart');
      cartCount.textContent = `${count}件`;
    };
    favoriteSearch.addEventListener('input', render);
    cartSearch.addEventListener('input', render);
    render();
  } catch (error) {
    emptyRow(favoriteTable, error.message || 'お気に入り情報を取得できませんでした。');
    emptyRow(cartTable, error.message || 'カート情報を取得できませんでした。');
    cartCount.textContent = '取得失敗';
  }
}

loadBuyerActivity();
