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
