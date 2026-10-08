import { authApi } from '../auth/auth-api.js';

async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.error || 'request_failed'); error.status = response.status; error.body = body; throw error; }
  return body;
}

const money = (value, currency = 'JPY') => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(value || 0));
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export async function renderSellerPayouts(root) {
  root.innerHTML = '<section class="loading-state"><p>Loading payouts…</p></section>';
  try {
    const data = await api('/seller/payouts');
    const payouts = Array.isArray(data.payouts) ? data.payouts : [];
    root.innerHTML = `
      <section class="page-section">
        <div class="section-heading"><div><p class="eyebrow">Seller</p><h1>Payouts</h1><p>Request withdrawals and track their status.</p></div></div>
        <div class="card">
          <form id="payout-form">
            <label>Amount <input name="amount" type="number" min="0.01" step="0.01" required placeholder="0.00"></label>
            <label>Currency <select name="currency"><option value="JPY">JPY</option><option value="USD">USD</option><option value="EUR">EUR</option></select></label>
            <button class="button" type="submit">Request payout</button>
            <p id="payout-message" class="microcopy" aria-live="polite"></p>
          </form>
        </div>
        <div class="card"><h2>Recent payouts</h2>
          ${payouts.length ? `<div class="table-wrap"><table><thead><tr><th>Amount</th><th>Currency</th><th>Status</th><th>Requested</th><th>Paid</th></tr></thead><tbody>${payouts.map((payout) => `<tr><td>${escapeHtml(money(payout.amount, payout.currency))}</td><td>${escapeHtml(payout.currency)}</td><td>${escapeHtml(payout.status)}</td><td>${escapeHtml(payout.requested_at || '—')}</td><td>${escapeHtml(payout.paid_at || '—')}</td></tr>`).join('')}</tbody></table></div>` : '<p class="microcopy">No payout requests yet.</p>'}
        </div>
      </section>`;
    document.querySelector('#payout-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const message = form.querySelector('#payout-message');
      const button = form.querySelector('button');
      button.disabled = true; message.textContent = 'Submitting…';
      try {
        const payload = Object.fromEntries(new FormData(form));
        const result = await api('/seller/payouts', { method: 'POST', body: JSON.stringify({ amount: Number(payload.amount), currency: payload.currency }) });
        message.textContent = result?.payout?.status === 'requested' ? 'Payout request submitted.' : 'Payout request submitted.';
        button.disabled = false;
      } catch (error) {
        message.textContent = error.body?.error || 'Unable to submit payout request.';
        button.disabled = false;
      }
    });
  } catch (error) {
    if (error.status === 401) { location.hash = '#/login?return=/seller/payouts'; return; }
    root.innerHTML = '<section class="empty-state"><h2>Payouts unavailable</h2><p>Please try again shortly.</p></section>';
  }
}

export function initSellerPaymentHistoryPage() {
  const list = document.querySelector('#payment-history-list');
  const pagination = document.querySelector('#payment-history-pagination');
  if (!list || !pagination) return;
  const pageSize = 10;
  const statusLabels = { requested: '申請中', reviewing: '確認中', approved: '承認済み', processing: '処理中', paid: '入金済み', failed: '失敗', cancelled: 'キャンセル' };

  function formatYen(amount, currency = 'JPY') {
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency, maximumFractionDigits: 0 }).format(Number(amount || 0));
  }
  function formatDate(value) { return value ? new Date(value).toLocaleDateString('ja-JP').replaceAll('/', '.') : '—'; }
  function renderPagination(meta) {
    const totalPages = Math.max(1, Number(meta?.total_pages || 1));
    const current = Math.min(Math.max(1, Number(meta?.page || 1)), totalPages);
    const links = [];
    for (let page = 1; page <= totalPages; page += 1) links.push(`<a href="?page=${page}" data-page="${page}" class="${page === current ? 'is-current' : ''}" aria-current="${page === current ? 'page' : 'false'}">${page}</a>`);
    if (totalPages > 1 && current < totalPages) links.push(`<a href="?page=${current + 1}" data-page="${current + 1}">次へ →</a>`);
    pagination.innerHTML = links.join('');
  }
  async function load(page = 1) {
    const response = await fetch(`/api/seller/payouts?page=${page}&per_page=${pageSize}`, { credentials: 'same-origin' });
    const body = await response.json().catch(() => null);
    if (!response.ok) { const error = new Error(body?.error?.message || body?.error || '入金履歴を取得できませんでした。'); error.status = response.status; throw error; }
    const payouts = Array.isArray(body?.payouts) ? body.payouts : [];
    list.innerHTML = payouts.length ? payouts.map((payout) => {
      const status = statusLabels[payout.status] || payout.status || '—';
      const date = payout.paid_at || payout.requested_at;
      const dateLabel = payout.paid_at ? `${formatDate(date)}　入金済み` : `${formatDate(date)}　入金予定・申請中`;
      return `<div class="seller-video-row"><div class="seller-video-info"><strong>${dateLabel}</strong><small>入金金額 ${formatYen(payout.amount, payout.currency)}${payout.failure_reason ? `　理由：${payout.failure_reason}` : ''}</small></div><span class="seller-video-status ${payout.status === 'paid' ? 'is-published' : 'is-pending'}">${status}</span><span class="seller-video-edit">${formatYen(payout.amount, payout.currency)}</span></div>`;
    }).join('') : '<small>入金履歴はありません。</small>';
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