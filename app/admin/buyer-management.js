const table = document.getElementById('buyer-table');
const body = table?.tBodies[0];
const search = document.getElementById('buyer-search');
const statusFilter = document.getElementById('buyer-status');
const count = document.getElementById('buyer-count');
const section = table?.closest('.panel');
const statusLabels = { active: '利用中', suspended: '一時停止', pending: '確認中' };
const pageSize = 20;
let buyers = [];
let page = 1;

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ja-JP');
}

function formatMoney(value) {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function makeCell(value, className = '') {
  const cell = document.createElement('td');
  if (className) cell.className = className;
  cell.textContent = value;
  return cell;
}

function render() {
  const keyword = search.value.trim().toLocaleLowerCase();
  const filtered = buyers.filter((buyer) => {
    const label = statusLabels[buyer.status] || '確認中';
    const matchesKeyword = `${buyer.displayName} ${buyer.email}`.toLocaleLowerCase().includes(keyword);
    return matchesKeyword && (!statusFilter.value || label === statusFilter.value);
  });
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  page = Math.min(page, pages);
  body.replaceChildren();

  const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  if (!visible.length) {
    const row = document.createElement('tr');
    const cell = makeCell('該当する購入者はいません。');
    cell.colSpan = 5;
    row.append(cell);
    body.append(row);
  } else {
    visible.forEach((buyer) => {
      const row = document.createElement('tr');
      const identity = document.createElement('td');
      const name = document.createElement('strong');
      name.textContent = buyer.displayName || '（氏名未登録）';
      const email = document.createElement('small');
      email.textContent = buyer.email;
      identity.append(name, email);
      const label = statusLabels[buyer.status] || '確認中';
      const tag = document.createElement('span');
      tag.className = `tag ${buyer.status === 'active' ? 'ok' : buyer.status === 'suspended' ? 'danger' : 'warn'}`;
      tag.textContent = label;
      const state = document.createElement('td');
      state.append(tag);
      row.append(
        identity,
        makeCell(formatDate(buyer.createdAt)),
        makeCell(String(buyer.purchaseCount)),
        makeCell(formatMoney(buyer.totalSpent), 'money'),
        state
      );
      body.append(row);
    });
  }

  count.textContent = `${filtered.length}件`;
  let nav = section.querySelector('.table-pagination');
  if (!nav) {
    nav = document.createElement('nav');
    nav.className = 'table-pagination';
    nav.setAttribute('aria-label', '購入者一覧ページ');
    section.append(nav);
  }
  nav.replaceChildren();
  const summary = document.createElement('span');
  summary.textContent = filtered.length
    ? `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)}件 / ${filtered.length}件`
    : '0件';
  const controls = document.createElement('div');
  controls.className = 'pagination-controls';
  const addButton = (label, target, disabled) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'pagination-button';
    button.textContent = label;
    button.disabled = disabled;
    button.addEventListener('click', () => { page = target; render(); });
    controls.append(button);
  };
  addButton('前へ', page - 1, page <= 1);
  addButton(`${page} / ${pages}`, page, true);
  addButton('次へ', page + 1, page >= pages);
  nav.append(summary, controls);
}

async function loadBuyers() {
  body.replaceChildren();
  const row = document.createElement('tr');
  const cell = makeCell('購入者情報を読み込んでいます…');
  cell.colSpan = 5;
  row.append(cell);
  body.append(row);
  try {
    const response = await fetch('/api/admin/buyers', { credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok) throw new Error(result?.error?.message || '購入者一覧を取得できませんでした。');
    buyers = Array.isArray(result.buyers) ? result.buyers : [];
    render();
  } catch (error) {
    body.replaceChildren();
    const errorRow = document.createElement('tr');
    const errorCell = makeCell(error.message || '購入者一覧を取得できませんでした。');
    errorCell.colSpan = 5;
    errorRow.append(errorCell);
    body.append(errorRow);
    count.textContent = '取得失敗';
  }
}

search.addEventListener('input', () => { page = 1; render(); });
statusFilter.addEventListener('change', () => { page = 1; render(); });
loadBuyers();
