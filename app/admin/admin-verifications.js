async function api(path, options = {}) { const r = await fetch(`/api${path}`, { credentials:'include', headers:{'Content-Type':'application/json', ...(options.headers||{})}, ...options }); const body = await r.json().catch(()=>({})); if(!r.ok){const e=new Error(body?.error||'request_failed');e.status=r.status;e.body=body;throw e;} return body; }
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function renderAdminVerifications(root){ root.innerHTML='<section class="loading-state"><p>Loading seller verification queue…</p></section>'; try{const {sellers=[]}=await api('/admin/seller-verifications?status=submitted'); root.innerHTML=`<section class="page-section"><div class="section-heading"><div><p class="eyebrow">Admin</p><h1>Seller verification</h1><p>Review submitted seller profiles and record auditable decisions.</p></div></div><div class="card"><div class="table-wrap"><table><thead><tr><th>Seller</th><th>Legal name</th><th>Country</th><th>Submitted</th><th>Review</th></tr></thead><tbody>${sellers.length?sellers.map(s=>`<tr><td>${esc(s.email)}<br><small>${esc(s.display_name)}</small></td><td>${esc(s.legal_name)}</td><td>${esc(s.country_code)}</td><td>${esc(s.submitted_at)}</td><td><select data-user="${esc(s.user_id)}"><option value="">Action…</option><option value="start_review">Start review</option><option value="approve">Approve</option><option value="reject">Reject</option><option value="request_changes">Request changes</option></select><input data-note="${esc(s.user_id)}" maxlength="1000" placeholder="Note (required for reject/change)"><button class="button secondary verify-action" data-user="${esc(s.user_id)}">Apply</button><button class="button secondary verify-audit" data-user="${esc(s.user_id)}">Audit</button></td></tr>`).join(''):'<tr><td colspan="5">No submitted seller verifications.</td></tr>'}</tbody></table></div><p id="admin-verification-message" class="microcopy" aria-live="polite"></p></div></section>`;
root.querySelectorAll('.verify-action').forEach(btn=>btn.addEventListener('click',async()=>{const id=btn.dataset.user,sel=root.querySelector(`select[data-user="${CSS.escape(id)}"]`),note=root.querySelector(`input[data-note="${CSS.escape(id)}"]`),action=sel?.value,msg=root.querySelector('#admin-verification-message');if(!action){msg.textContent='Choose an action.';return;}if((action==='reject'||action==='request_changes')&&!note.value.trim()){msg.textContent='A note is required for this action.';return;}btn.disabled=true;msg.textContent='Updating…';try{await api(`/admin/seller-verifications/${encodeURIComponent(id)}/review`,{method:'POST',body:JSON.stringify({action,note:note.value.trim()||null})});await renderAdminVerifications(root);}catch(e){msg.textContent=e.body?.error||'Unable to update verification.';btn.disabled=false;}}));
root.querySelectorAll('.verify-audit').forEach(btn=>btn.addEventListener('click',async()=>{const msg=root.querySelector('#admin-verification-message');try{const d=await api(`/admin/seller-verifications/${encodeURIComponent(btn.dataset.user)}/audit`);msg.textContent=d.events?.length?`Audit events: ${d.events.map(e=>`${e.action} (${e.actor_email||'system'})`).join(' · ')}`:'No audit events.';}catch(e){msg.textContent=e.body?.error||'Unable to load audit log.';}}));
}catch(e){root.innerHTML=e.status===401||e.status===403?'<section class="empty-state"><h2>Admin access required</h2><p>Your account does not have permission to view seller verification.</p></section>':'<section class="empty-state"><h2>Seller verification unavailable</h2><p>Please try again shortly.</p></section>';}}


export function bindSellerVerificationReviewPage() {
  const table = document.getElementById('verification-table');
  if (!table) return;

  const search = document.getElementById('verification-search');
  const status = document.getElementById('verification-status');
  const count = document.getElementById('verification-count');
  const note = document.getElementById('verification-note');

  const statusLabel = {
    submitted: '確認待ち',
    under_review: '審査中',
    request_changes: '差し戻し',
    verified: '確認済み',
    rejected: '却下',
    not_started: '未申請',
  };

  const render = (items) => {
    table.tBodies[0].replaceChildren(...(items.length ? items.map((item) => {
      const row = document.createElement('tr');
      row.dataset.status = statusLabel[item.verification_status] || item.verification_status;
      row.dataset.userId = item.user_id;
      row.innerHTML = '<td><strong>' + esc(item.display_name) + '</strong><small>' + esc(item.email) + '</small></td>'
        + '<td>' + esc(item.country_code) + '</td>'
        + '<td>' + (item.submitted_at ? new Date(item.submitted_at).toLocaleDateString('ja-JP').replaceAll('/', '.') : '') + '</td>'
        + '<td><span class="tag ' + (item.verification_status === 'verified' ? 'ok' : 'warn') + '">' + esc(statusLabel[item.verification_status] || item.verification_status) + '</span></td>'
        + '<td><button class="btn small" data-action="start">審査開始</button> <button class="btn small" data-action="approve">確認済み</button> <button class="btn small" data-action="changes">差し戻し</button></td>';
      return row;
    }) : [Object.assign(document.createElement('tr'), { innerHTML: '<td colspan="5">該当する本人確認はありません。</td>' })]));
    count.textContent = items.length + '件';
  };

  const load = async () => {
    const selectedStatus = status.value || 'submitted';
    try {
      let sellers = [];
      if (selectedStatus === 'all') {
        const statuses = ['submitted', 'under_review', 'verified', 'rejected', 'request_changes', 'not_started'];
        const results = await Promise.all(
          statuses.map((value) => api('/admin/seller-verifications?status=' + value))
        );
        sellers = results.flatMap((result) => result.sellers || []);
      } else {
        const result = await api('/admin/seller-verifications?status=' + encodeURIComponent(selectedStatus));
        sellers = result.sellers || [];
      }
      const query = search.value.trim().toLowerCase();
      render(sellers.filter((item) => !query || [item.display_name, item.email].some((value) => String(value ?? '').toLowerCase().includes(query))));
    } catch (error) {
      table.tBodies[0].innerHTML = '<tr><td colspan="5">本人確認情報を取得できませんでした。</td></tr>';
      count.textContent = '0件';
    }
  };

  table.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const row = button.closest('tr');
    const id = row?.dataset.userId;
    const action = { start: 'start_review', approve: 'approve', changes: 'request_changes' }[button.dataset.action];
    if (!id || !action) return;
    const reviewNote = note.value.trim();
    if (action === 'request_changes' && !reviewNote) {
      alert('差し戻し理由を本人確認メモに入力してください。');
      note.focus();
      return;
    }
    button.disabled = true;
    try {
      await api('/admin/seller-verifications/' + encodeURIComponent(id) + '/review', {
        method: 'POST',
        body: JSON.stringify({ action, note: reviewNote || null }),
      });
      await load();
    } catch (error) {
      alert('本人確認処理に失敗しました。');
      button.disabled = false;
    }
  });

  search.addEventListener('input', load);
  status.addEventListener('change', load);
  load();
}

if (document.getElementById('verification-table')) {
  bindSellerVerificationReviewPage();
}
