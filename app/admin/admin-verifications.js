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

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char]));

const esc = escapeHtml;

function renderSellerRows(sellers) {
  if (!sellers.length) {
    return '<tr><td colspan="5">No submitted seller verifications.</td></tr>';
  }

  return sellers.map((seller) => {
    const userId = escapeHtml(seller.user_id);
    return `
      <tr>
        <td>${escapeHtml(seller.email)}<br><small>${escapeHtml(seller.display_name)}</small></td>
        <td>${escapeHtml(seller.legal_name)}</td>
        <td>${escapeHtml(seller.country_code)}</td>
        <td>${escapeHtml(seller.submitted_at)}</td>
        <td>
          <select data-user="${userId}">
            <option value="">Action…</option>
            <option value="start_review">Start review</option>
            <option value="approve">Approve</option>
            <option value="reject">Reject</option>
            <option value="request_changes">Request changes</option>
          </select>
          <input data-note="${userId}" maxlength="1000" placeholder="Note (required for reject/change)">
          <button class="button secondary verify-action" data-user="${userId}" type="button">Apply</button>
          <button class="button secondary verify-audit" data-user="${userId}" type="button">Audit</button>
        </td>
      </tr>
    `;
  }).join('');
}

function renderQueue(sellers) {
  return `
    <section class="page-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>Seller verification</h1>
          <p>Review submitted seller profiles and record auditable decisions.</p>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Legal name</th>
                <th>Country</th>
                <th>Submitted</th>
                <th>Review</th>
              </tr>
            </thead>
            <tbody>${renderSellerRows(sellers)}</tbody>
          </table>
        </div>
        <p id="admin-verification-message" class="microcopy" aria-live="polite"></p>
      </div>
    </section>
  `;
}

function getUserControls(root, userId) {
  const escapedId = CSS.escape(userId);
  return {
    action: root.querySelector(`select[data-user="${escapedId}"]`),
    note: root.querySelector(`input[data-note="${escapedId}"]`),
  };
}

function bindReviewActions(root) {
  root.querySelectorAll('.verify-action').forEach((button) => {
    button.addEventListener('click', async () => {
      const userId = button.dataset.user;
      const { action: selector, note } = getUserControls(root, userId);
      const action = selector?.value;
      const message = root.querySelector('#admin-verification-message');

      if (!action) {
        message.textContent = 'Choose an action.';
        return;
      }

      const reviewNote = note?.value.trim() || '';
      if (['reject', 'request_changes'].includes(action) && !reviewNote) {
        message.textContent = 'A note is required for this action.';
        return;
      }

      button.disabled = true;
      message.textContent = 'Updating…';

      try {
        await api(`/admin/seller-verifications/${encodeURIComponent(userId)}/review`, {
          method: 'POST',
          body: JSON.stringify({ action, note: reviewNote || null }),
        });
        await renderAdminVerifications(root);
      } catch (error) {
        message.textContent = error.body?.error || 'Unable to update verification.';
        button.disabled = false;
      }
    });
  });

  root.querySelectorAll('.verify-audit').forEach((button) => {
    button.addEventListener('click', async () => {
      const message = root.querySelector('#admin-verification-message');

      try {
        const result = await api(
          `/admin/seller-verifications/${encodeURIComponent(button.dataset.user)}/audit`,
        );
        message.textContent = result.events?.length
          ? `Audit events: ${result.events.map((event) => `${event.action} (${event.actor_email || 'system'})`).join(' · ')}`
          : 'No audit events.';
      } catch (error) {
        message.textContent = error.body?.error || 'Unable to load audit log.';
      }
    });
  });
}

export async function renderAdminVerifications(root) {
  root.innerHTML = '<section class="loading-state"><p>Loading seller verification queue…</p></section>';

  try {
    const { sellers = [] } = await api('/admin/seller-verifications?status=submitted');
    root.innerHTML = renderQueue(sellers);
    bindReviewActions(root);
  } catch (error) {
    root.innerHTML = error.status === 401 || error.status === 403
      ? '<section class="empty-state"><h2>Admin access required</h2><p>Your account does not have permission to view seller verification.</p></section>'
      : '<section class="empty-state"><h2>Seller verification unavailable</h2><p>Please try again shortly.</p></section>';
  }
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
        submitted: '<button class="btn small" data-action="start">審査開始</button> <button class="btn small" data-action="approve">確認済み</button> <button class="btn small" data-action="changes">差し戻し</button> <button class="btn small" data-action="reject">却下</button>',
        under_review: '<button class="btn small" data-action="approve">確認済み</button> <button class="btn small" data-action="changes">差し戻し</button> <button class="btn small" data-action="reject">却下</button>',
        request_changes: '<span class="muted">再申請待ち</span>',
        rejected: '<span class="muted">再申請待ち</span>',
        verified: '<span class="muted">処理済み</span>',
        not_started: item.verification_method === 'none'
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
      && ['not_started', 'submitted', 'under_review'].includes(row?.dataset.verificationStatus)
      && row?.dataset.verificationMethod === 'none'
      && row?.dataset.verificationDocumentStatus !== 'uploaded';
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
