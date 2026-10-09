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

const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

const transitions = {
  requested: ['reviewing', 'cancelled'],
  reviewing: ['approved', 'processing', 'failed', 'cancelled'],
  approved: ['processing', 'cancelled'],
  processing: ['paid', 'failed'],
  failed: ['reviewing'],
  cancelled: [],
  paid: [],
};

export async function renderAdminPayouts(root) {
  root.innerHTML = '<section class="loading-state"><p>Loading payout queue…</p></section>';

  try {
    const { payouts = [] } = await api('/admin/payouts');
    root.innerHTML = `<section class="page-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Admin</p>
          <h1>Payout operations</h1>
          <p>Review seller withdrawal requests and record controlled status transitions.</p>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Requested</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>${payouts.length
              ? payouts.map((payout) => `<tr>
                <td>${esc(payout.seller_email)}</td>
                <td>${esc(payout.amount)} ${esc(payout.currency)}</td>
                <td>${esc(payout.status)}</td>
                <td>${esc(payout.requested_at)}</td>
                <td>
                  <select data-payout="${esc(payout.id)}" ${transitions[payout.status]?.length ? '' : 'disabled'}>
                    <option value="">Select…</option>
                    ${(transitions[payout.status] || []).map((status) => `<option value="${status}">${status}</option>`).join('')}
                  </select>
                  <button class="button secondary payout-action" data-payout="${esc(payout.id)}" ${transitions[payout.status]?.length ? '' : 'disabled'}>Apply</button>
                  <button class="button secondary payout-audit" data-payout="${esc(payout.id)}">Audit</button>
                </td>
              </tr>`).join('')
              : '<tr><td colspan="5">No payout requests.</td></tr>'}
            </tbody>
          </table>
        </div>
        <p id="admin-payout-message" class="microcopy" aria-live="polite"></p>
      </div>
    </section>`;

    root.querySelectorAll('.payout-action').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.payout;
        const select = root.querySelector(`select[data-payout="${CSS.escape(id)}"]`);
        const status = select?.value;
        const message = root.querySelector('#admin-payout-message');

        if (!status) {
          message.textContent = 'Choose a valid next status.';
          return;
        }

        let failure_reason = null;
        if (status === 'failed') {
          failure_reason = window.prompt('Failure reason (optional):') || null;
        }

        button.disabled = true;
        message.textContent = 'Updating…';

        try {
          await api(`/admin/payouts/${encodeURIComponent(id)}/status`, {
            method: 'POST',
            body: JSON.stringify({ status, failure_reason }),
          });
          await renderAdminPayouts(root);
        } catch (error) {
          message.textContent = error.body?.error || 'Unable to update payout.';
          button.disabled = false;
        }
      });
    });

    root.querySelectorAll('.payout-audit').forEach((button) => {
      button.addEventListener('click', async () => {
        const message = root.querySelector('#admin-payout-message');

        try {
          const data = await api(`/admin/payouts/${encodeURIComponent(button.dataset.payout)}/audit`);
          message.textContent = data.events?.length
            ? `Audit events: ${data.events.map((event) => `${event.action} (${event.actor_email || 'system'})`).join(' · ')}`
            : 'No audit events.';
        } catch (error) {
          message.textContent = error.body?.error || 'Unable to load audit log.';
        }
      });
    });
  } catch (error) {
    if (error.status === 401 || error.status === 403) {
      root.innerHTML = '<section class="empty-state"><h2>Admin access required</h2><p>Your account does not have permission to view payout operations.</p></section>';
      return;
    }

    root.innerHTML = '<section class="empty-state"><h2>Payout operations unavailable</h2><p>Please try again shortly.</p></section>';
  }
}
