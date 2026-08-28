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
