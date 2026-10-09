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
