async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body?.error || 'request_failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }

  return body;
}

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

export function renderAdminVerifications(root) {
  root.innerHTML = `
    <section class="admin-shell">
      <header class="admin-header">
        <div>
          <p class="eyebrow">Operator</p>
          <h1>Seller identity verification</h1>
          <p>Review submitted documents or record verification received by email.</p>
        </div>
        <a class="button secondary" href="#/admin">Back to dashboard</a>
      </header>
      <section class="admin-panel">
        <div class="admin-toolbar">
          <label for="verification-search">Search seller</label>
          <input id="verification-search" type="search" autocomplete="off" placeholder="Name or email">
          <label for="verification-status">Status</label>
          <select id="verification-status">
            <option value="submitted">確認待ち</option>
            <option value="under_review">審査中</option>
            <option value="request_changes">差し戻し</option>
            <option value="verified">確認済み</option>
            <option value="rejected">却下</option>
            <option value="not_started">未申請</option>
            <option value="all">すべて</option>
          </select>
          <span id="verification-count" aria-live="polite">0件</span>
        </div>
        <label for="verification-note">本人確認メモ（承認・差し戻し・却下時）</label>
        <textarea id="verification-note" rows="3" maxlength="2000" placeholder="メールで受け取った書類の確認内容、または差し戻し・却下理由"></textarea>
        <div class="table-wrap">
          <table id="verification-table">
            <thead><tr><th>販売者</th><th>本人確認情報</th><th>申請日</th><th>状態</th><th>操作</th></tr></thead>
            <tbody><tr><td colspan="5">読み込み中…</td></tr></tbody>
          </table>
        </div>
      </section>
    </section>
  `;
  bindSellerVerificationReviewPage();
}

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
      row.dataset.verificationStatus = item.verification_status;
      row.dataset.userId = item.user_id;
      row.dataset.verificationMethod = item.verification_method || 'none';
      row.dataset.verificationDocumentStatus = item.verification_document_status || 'missing';
      const actions = {
        submitted: '<button class="btn small" data-action="start">審査開始</button> <button class="btn small" data-action="approve">' + (item.verification_method === 'email' ? 'メール確認を承認' : '確認済み') + '</button> <button class="btn small" data-action="changes">差し戻し</button> <button class="btn small" data-action="reject">却下</button>',
        under_review: '<button class="btn small" data-action="approve">' + (item.verification_method === 'email' ? 'メール確認を承認' : '確認済み') + '</button> <button class="btn small" data-action="changes">差し戻し</button> <button class="btn small" data-action="reject">却下</button>',
        request_changes: item.verification_method === 'email'
          ? '<button class="btn small" data-action="approve">メール確認を承認</button>'
          : '<span class="muted">再申請待ち</span>',
        rejected: item.verification_method === 'email'
          ? '<button class="btn small" data-action="approve">メール確認を承認</button>'
          : '<span class="muted">再申請待ち</span>',
        verified: '<span class="muted">処理済み</span>',
        not_started: item.verification_method === 'email'
          ? '<button class="btn small" data-action="approve">メール確認を承認</button>'
          : '<span class="muted">本人確認書類の提出待ち</span>',
      }[item.verification_status] || '<span class="muted">処理不可</span>';
      const sellerDetails = [
        '<strong>氏名：</strong>' + esc(item.legal_name),
        '<strong>国：</strong>' + esc(item.country_code),
        '<strong>住所：</strong>' + esc(item.address),
        '<strong>郵便番号：</strong>' + esc(item.postal_code),
        '<strong>電話：</strong>' + esc(item.phone),
        '<strong>自己紹介：</strong>' + esc(item.bio),
        item.verification_document_id
          ? '<a href="/api/admin/seller-verifications/' + encodeURIComponent(item.user_id)
            + '/document" target="_blank" rel="noopener">本人確認書類を確認する</a>'
          : item.verification_method === 'email'
            ? '<span class="muted">メール受信箱で提出書類を確認</span>'
            : '<span class="muted">本人確認書類なし</span>',
      ].join('<br>');
      const submittedDate = item.submitted_at
        ? new Date(item.submitted_at).toLocaleDateString('ja-JP').replaceAll('/', '.')
        : '';
      const statusClass = item.verification_status === 'verified' ? 'ok' : 'warn';

      row.innerHTML = '<td><strong>' + esc(item.display_name) + '</strong><small>'
        + esc(item.email) + '</small></td>'
        + '<td>' + sellerDetails + '</td>'
        + '<td>' + submittedDate + '</td>'
        + '<td><span class="tag ' + statusClass + '">'
        + esc(statusLabel[item.verification_status] || item.verification_status)
        + '</span></td>'
        + '<td>' + actions + '</td>';
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
    const action = { start: 'start_review', approve: 'approve', changes: 'request_changes', reject: 'reject' }[button.dataset.action];
    if (!id || !action) return;
    const reviewNote = note.value.trim();
    const emailApproval = action === 'approve'
      && ['not_started', 'submitted', 'under_review', 'request_changes', 'rejected'].includes(row?.dataset.verificationStatus)
      && row?.dataset.verificationMethod === 'email';
    if (emailApproval && !reviewNote) {
      alert('メールで受け取った本人確認書類の確認内容を本人確認メモに入力してください。');
      note.focus();
      return;
    }
    if (['request_changes', 'reject'].includes(action) && !reviewNote) {
      alert(action === 'reject' ? '却下理由を本人確認メモに入力してください。' : '差し戻し理由を本人確認メモに入力してください。');
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
