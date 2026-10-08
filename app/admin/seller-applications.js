async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.error || 'request_failed'); error.status = response.status; error.body = body; throw error; }
  return body;
}
const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const statuses = ['pending','under_review','approved','rejected','withdrawn'];

export async function renderSellerApplications(root) {
  root.innerHTML = '<section class="page-section"><div class="card"><p>Loading seller applications…</p></div></section>';
  try {
    const { applications = [] } = await api('/admin/seller-applications?status=pending');
    root.innerHTML = `<section class="page-section"><div class="section-heading"><div><p class="eyebrow">Admin</p><h1>Seller applications</h1><p>Review creator applications before granting seller privileges.</p></div></div><div class="card"><div class="application-filters"><label>Status<select id="seller-application-status">${statuses.map((s) => `<option value="${s}" ${s === 'pending' ? 'selected' : ''}>${s}</option>`).join('')}</select></label></div><div class="table-wrap"><table><thead><tr><th>Applicant</th><th>Legal name</th><th>Country</th><th>Message</th><th>Review</th></tr></thead><tbody>${applications.length ? applications.map((a) => `<tr><td>${esc(a.email)}<br><small>${esc(a.display_name)}</small></td><td>${esc(a.legal_name)}</td><td>${esc(a.country_code)}</td><td>${esc(a.message || '—')}</td><td><select data-action="${esc(a.id)}"><option value="">Action…</option>${a.status === 'pending' ? '<option value="start_review">Start review</option><option value="approve">Approve</option><option value="reject">Reject</option>' : a.status === 'under_review' ? '<option value="approve">Approve</option><option value="reject">Reject</option>' : ''}</select><input data-note="${esc(a.id)}" maxlength="1000" placeholder="Note (required for reject)"><button class="button secondary application-action" data-id="${esc(a.id)}" type="button">Apply</button></td></tr>`).join('') : '<tr><td colspan="5">No applications in this status.</td></tr>'}</tbody></table></div><p id="seller-application-admin-message" class="microcopy" aria-live="polite"></p></div></section>`;
    const loadStatus = async (status) => { const data = await api(`/admin/seller-applications?status=${encodeURIComponent(status)}`); return data.applications || []; };
    root.querySelector('#seller-application-status').addEventListener('change', async (event) => { const status = event.target.value; try { const list = await loadStatus(status); const rows = root.querySelector('tbody'); rows.innerHTML = list.length ? list.map((a) => `<tr><td>${esc(a.email)}<br><small>${esc(a.display_name)}</small></td><td>${esc(a.legal_name)}</td><td>${esc(a.country_code)}</td><td>${esc(a.message || '—')}</td><td><select data-action="${esc(a.id)}"><option value="">Action…</option>${a.status === 'pending' ? '<option value="start_review">Start review</option><option value="approve">Approve</option><option value="reject">Reject</option>' : a.status === 'under_review' ? '<option value="approve">Approve</option><option value="reject">Reject</option>' : ''}</select><input data-note="${esc(a.id)}" maxlength="1000" placeholder="Note (required for reject)"><button class="button secondary application-action" data-id="${esc(a.id)}" type="button">Apply</button></td></tr>`).join('') : '<tr><td colspan="5">No applications in this status.</td></tr>'; bindActions(); } catch (error) { root.querySelector('#seller-application-admin-message').textContent = error.body?.error || 'Unable to load applications.'; } });
    function bindActions() { root.querySelectorAll('.application-action').forEach((button) => button.addEventListener('click', async () => { const id = button.dataset.id; const action = root.querySelector(`select[data-action="${CSS.escape(id)}"]`)?.value; const note = root.querySelector(`input[data-note="${CSS.escape(id)}"]`)?.value.trim() || null; const message = root.querySelector('#seller-application-admin-message'); if (!action) { message.textContent = 'Choose an action.'; return; } if (action === 'reject' && !note) { message.textContent = 'A note is required for rejection.'; return; } button.disabled = true; message.textContent = 'Updating…'; try { await api(`/admin/seller-applications/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ action, note }) }); await renderSellerApplications(root); } catch (error) { message.textContent = error.body?.error || 'Unable to update application.'; button.disabled = false; } })); }
    bindActions();
  } catch (error) { root.innerHTML = error.status === 401 || error.status === 403 ? '<section class="empty-state"><h2>Admin access required</h2><p>Your account does not have permission to review seller applications.</p></section>' : '<section class="empty-state"><h2>Seller applications unavailable</h2><p>Please try again shortly.</p></section>'; }
}


export function bindSellerApplicationReviewPage() {
  const table = document.getElementById('application-table');
  if (!table) return;

  const search = document.getElementById('application-search');
  const status = document.getElementById('application-status');
  const count = document.getElementById('application-count');
  const note = document.getElementById('application-note');

  const statusLabel = {
    pending: '審査待ち',
    under_review: '審査中',
    approved: '承認済み',
    rejected: '却下',
    withdrawn: '取り下げ',
  };

  const render = (items) => {
    table.tBodies[0].replaceChildren(...(items.length ? items.map((item) => {
      const row = document.createElement('tr');
      row.dataset.status = statusLabel[item.status] || item.status;
      row.dataset.id = item.id;
      row.innerHTML = '<td><strong>' + esc(item.display_name) + '</strong><small>' + esc(item.email) + '</small></td>'
        + '<td>法的氏名：' + esc(item.legal_name) + '<br>国：' + esc(item.country_code) + '<br>申請メッセージ：' + esc(item.message || '') + '</td>'
        + '<td>' + (item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('ja-JP').replaceAll('/', '.') : '') + '</td>'
        + '<td><span class="tag ' + (item.status === 'approved' ? 'ok' : 'warn') + '">' + esc(statusLabel[item.status] || item.status) + '</span></td>'
        + '<td>'
        + (item.status === 'pending' ? '<button class="btn small" data-action="start">審査開始</button> ' : '')
        + (item.status === 'pending' || item.status === 'under_review' ? '<button class="btn small" data-action="approve">承認</button> <button class="btn small" data-action="reject">却下</button>' : '<span class="muted">処理済み</span>')
        + '</td>';
      return row;
    }) : [Object.assign(document.createElement('tr'), { innerHTML: '<td colspan="5">該当する販売者申請はありません。</td>' })]));
    count.textContent = items.length + '件';
  };

  const load = async () => {
    const statusValues = {
      '': 'pending',
      '審査待ち': 'pending',
      '審査中': 'under_review',
      '承認済み': 'approved',
      '却下': 'rejected',
      '取り下げ': 'withdrawn',
    };
    const selected = statusValues[status.value] ?? 'pending';
    const statuses = selected ? [selected] : ['pending'];
    try {
      const responses = await Promise.all(statuses.map((value) => api('/admin/seller-applications?status=' + encodeURIComponent(value))));
      const applications = responses.flatMap((response) => response.applications || []);
      const query = search.value.trim().toLowerCase();
      render(applications.filter((item) => {
        if (!query) return true;
        return [item.display_name, item.legal_name, item.email].some((value) => String(value ?? '').toLowerCase().includes(query));
      }));
    } catch (error) {
      table.tBodies[0].innerHTML = '<tr><td colspan="5">販売者申請を取得できませんでした。</td></tr>';
      count.textContent = '0件';
    }
  };

  table.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('tr');
    const id = row?.dataset.id;
    const action = { start: 'start_review', approve: 'approve', reject: 'reject' }[button.dataset.action];
    if (!id || !action) return;
    const reviewNote = note.value.trim();
    if (action === 'reject' && !reviewNote) {
      alert('却下理由を審査メモに入力してください。');
      note.focus();
      return;
    }
    button.disabled = true;
    try {
      await api('/admin/seller-applications/' + encodeURIComponent(id) + '/review', {
        method: 'POST',
        body: JSON.stringify({ action, note: reviewNote || null }),
      });
      await load();
    } catch (error) {
      alert('審査処理に失敗しました。');
      button.disabled = false;
    }
  });

  search.addEventListener('input', load);
  status.addEventListener('change', load);
  load();
}


export function bindSellerDirectoryPage() {
  const table = document.getElementById('seller-table');
  if (!table) return;

  const search = document.getElementById('seller-search');
  const status = document.getElementById('seller-status');
  const count = document.getElementById('seller-count');
  const statusLabel = { submitted: '本人確認待ち', under_review: '審査中', verified: '確認済み', rejected: '却下', not_started: '本人確認前' };

  const render = (items) => {
    table.tBodies[0].replaceChildren(...(items.length ? items.map((item) => {
      const row = document.createElement('tr');
      const accountLabel = item.account_status === 'active' ? '販売中' : item.account_status === 'suspended' ? '利用停止' : '無効';
      const verificationLabel = statusLabel[item.verification_status] || item.verification_status;
      row.innerHTML = '<td><strong>' + esc(item.display_name) + '</strong><small>' + esc(item.email) + '</small></td>'
        + '<td>' + (item.created_at ? new Date(item.created_at).toLocaleDateString('ja-JP').replaceAll('/', '.') : '') + '</td>'
        + '<td><span class="tag ' + (item.verification_status === 'verified' ? 'ok' : 'warn') + '">' + esc(verificationLabel) + '</span></td>'
        + '<td><span class="tag ' + (item.account_status === 'active' ? 'ok' : 'warn') + '">' + esc(accountLabel) + '</span></td>'
        + '<td>—</td>'
        + '<td><a class="btn small" href="/pages/admin-seller-profile.html?seller=' + encodeURIComponent(item.user_id) + '">詳細を見る →</a></td>';
      return row;
    }) : [Object.assign(document.createElement('tr'), { innerHTML: '<td colspan="6">登録済みの販売者はありません。</td>' })]));
    count.textContent = items.length + '件';
  };

  const load = async () => {
    try {
      const { sellers = [] } = await api('/admin/sellers');
      const query = search.value.trim().toLowerCase();
      const selectedStatus = status.value;
      render(sellers.filter((item) => {
        const text = [item.display_name, item.email].map((value) => String(value ?? '').toLowerCase()).join(' ');
        const label = statusLabel[item.verification_status] || item.verification_status;
        return (!query || text.includes(query)) && (!selectedStatus || label === selectedStatus);
      }));
    } catch {
      table.tBodies[0].innerHTML = '<tr><td colspan="6">販売者情報を取得できませんでした。</td></tr>';
      count.textContent = '0件';
    }
  };

  search.addEventListener('input', load);
  status.addEventListener('change', load);
  load();
}

if (document.getElementById('seller-table')) {
  bindSellerDirectoryPage();
}

if (document.getElementById('application-table')) {
  bindSellerApplicationReviewPage();
}
