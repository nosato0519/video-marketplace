function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function request(path) {
  const response = await fetch(path, { credentials: 'same-origin' });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function money(amount, currency = 'JPY') {
  const value = Number(amount || 0);
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value);
}

export async function renderSellerEarnings(root) {
  root.innerHTML = `<main class="seller-shell">
    <header class="seller-header"><div><p class="eyebrow">Creator</p><h1>Sales & earnings</h1><p>Review completed sales, platform fees and your net earnings.</p></div><a class="button secondary" href="#/seller">Dashboard</a></header>
    <section class="seller-stats" aria-label="Earnings summary"><article><span>Total earned</span><strong id="earned">—</strong></article><article><span>Available</span><strong id="available">—</strong></article><article><span>Paid out</span><strong id="paid">—</strong></article><article><span>Sales</span><strong id="sales">—</strong></article></section>
    <section class="seller-card"><div class="section-heading"><h2>Recent earnings</h2><span id="earnings-status" class="microcopy" aria-live="polite"></span></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Order</th><th>Gross</th><th>Fee</th><th>Net</th><th>Status</th></tr></thead><tbody id="earnings-list"><tr><td colspan="6">Loading…</td></tr></tbody></table></div></section>
  </main>`;
  try {
    const data = await request('/api/seller/earnings');
    const summary = data.summary || {};
    const currency = data.earnings?.[0]?.currency || 'JPY';
    root.querySelector('#earned').textContent = money(summary.earned_amount, currency);
    root.querySelector('#available').textContent = money(summary.available_amount, currency);
    root.querySelector('#paid').textContent = money(summary.paid_amount, currency);
    root.querySelector('#sales').textContent = String(summary.sale_count || 0);
    const rows = data.earnings || [];
    root.querySelector('#earnings-list').innerHTML = rows.length ? rows.map((item) => `<tr><td>${escapeHtml(new Date(item.created_at).toLocaleString())}</td><td>${escapeHtml(item.order_id)}</td><td>${money(item.gross_amount, item.currency)}</td><td>${money(item.platform_fee, item.currency)}</td><td>${money(item.net_amount, item.currency)}</td><td>${escapeHtml(item.status)}</td></tr>`).join('') : '<tr><td colspan="6">No earnings yet.</td></tr>';
  } catch (error) {
    root.querySelector('#earnings-status').textContent = error.body?.error?.message || error.message || 'Unable to load earnings.';
    root.querySelector('#earnings-list').innerHTML = '<tr><td colspan="6">Earnings could not be loaded.</td></tr>';
  }
}

export function initSellerEarningsPage(view) {
  const list = document.querySelector('#monthly-sales-list, #sold-videos-list, #sales-history-list');
  const pagination = document.querySelector('#monthly-sales-pagination, #sold-videos-pagination, #sales-history-pagination');
  if (!list || !pagination) return;
  const pageSize = 10;

  function formatYen(amount) { return `¥${Number(amount || 0).toLocaleString('ja-JP')}`; }
  function formatDate(value) { return new Date(value).toLocaleDateString('ja-JP').replaceAll('/', '.'); }
  function renderPagination(meta) {
    const totalPages = Math.max(1, Number(meta?.total_pages || 1));
    const current = Math.min(Math.max(1, Number(meta?.page || 1)), totalPages);
    const links = [];
    for (let page = 1; page <= totalPages; page += 1) links.push(`<a href="?page=${page}" data-page="${page}" class="${page === current ? 'is-current' : ''}" aria-current="${page === current ? 'page' : 'false'}">${page}</a>`);
    if (totalPages > 1 && current < totalPages) links.push(`<a href="?page=${current + 1}" data-page="${current + 1}">次へ →</a>`);
    pagination.innerHTML = links.join('');
  }

  function renderRows(rows) {
    if (view === 'monthly') return rows.map((item) => {
      const month = new Date(item.month_start);
      const label = month.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      return `<div class="seller-video-row"><div class="seller-video-info"><strong>${label}</strong><small>売上 ${formatYen(item.gross_amount)}　手数料 ${formatYen(item.platform_fee)}　利益 ${formatYen(item.net_amount)}　販売 ${Number(item.sale_count || 0).toLocaleString('ja-JP')}件</small></div><span class="seller-video-status is-published">確定</span><span class="seller-video-edit">${formatYen(item.net_amount)}</span></div>`;
    }).join('');
    return rows.map((sale) => `<div class="seller-video-row"><div class="seller-video-info"><strong>${formatDate(sale.created_at)}　${sale.title || '動画'}</strong><small>${view === 'sold-videos' ? '金額' : '売上'} ${formatYen(sale.gross_amount)}　手数料 ${formatYen(sale.platform_fee)}　利益 ${formatYen(sale.net_amount)}</small></div><span class="seller-video-status is-published">${sale.status === 'refunded' ? '返金' : view === 'sold-videos' ? '販売済み' : '完了'}</span><span class="seller-video-edit">${formatYen(sale.net_amount)}</span></div>`).join('');
  }

  async function load(page = 1) {
    const response = await fetch(`/api/seller/earnings?view=${encodeURIComponent(view)}&page=${page}&per_page=${pageSize}`, { credentials: 'same-origin' });
    const body = await response.json().catch(() => null);
    if (!response.ok) { const error = new Error(body?.error || '売上履歴を取得できませんでした。'); error.status = response.status; throw error; }
    const rows = Array.isArray(body?.earnings) ? body.earnings : [];
    if (view === 'current-month') {
      const now = new Date();
      const monthLabel = now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });
      document.querySelector('#monthly-period').textContent = monthLabel.toUpperCase();
      document.querySelector('#monthly-period-title').textContent = `${monthLabel}の販売履歴`;
    }
    list.innerHTML = rows.length ? renderRows(rows) : `<small>${view === 'monthly' ? '売上履歴はありません。' : view === 'sold-videos' ? '販売済み動画はありません。' : '今月の売上履歴はありません。'}</small>`;
    renderPagination(body?.pagination);
  }

  pagination.addEventListener('click', (event) => {
    const link = event.target.closest('[data-page]');
    if (!link) return;
    event.preventDefault();
    const page = Number(link.dataset.page);
    history.replaceState(null, '', `?page=${page}`);
    load(page).catch((error) => { if (error.status === 401) window.location.href = '/pages/seller-login.html'; });
  });

  const initialPage = Math.max(1, Number.parseInt(new URLSearchParams(window.location.search).get('page'), 10) || 1);
  load(initialPage).catch((error) => { if (error.status === 401) window.location.href = '/pages/seller-login.html'; });
}