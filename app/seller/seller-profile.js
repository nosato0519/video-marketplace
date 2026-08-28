async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.error || 'request_failed'); error.status = response.status; error.body = body; throw error; }
  return body;
}

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

export async function renderSellerProfile(root) {
  root.innerHTML = '<section class="loading-state"><p>Loading profile…</p></section>';
  try {
    const { profile } = await api('/seller/profile');
    root.innerHTML = `
      <section class="page-section">
        <div class="section-heading"><div><p class="eyebrow">Seller</p><h1>Profile & verification</h1><p>Keep your seller information current before submitting verification.</p></div></div>
        <div class="card"><form id="seller-profile-form">
          <label>Display name <input name="displayName" maxlength="120" required value="${escapeHtml(profile?.displayName)}"></label>
          <label>Legal name <input name="legalName" maxlength="200" required value="${escapeHtml(profile?.legalName)}"></label>
          <label>Country code <input name="countryCode" maxlength="2" minlength="2" pattern="[A-Za-z]{2}" value="${escapeHtml(profile?.countryCode || '')}" placeholder="JP"></label>
          <button class="button" type="submit">Save profile</button>
          <p id="profile-message" class="microcopy" aria-live="polite"></p>
        </form></div>
        <div class="card"><h2>Verification</h2><p>Status: <strong>${escapeHtml(profile?.verificationStatus || 'not_started')}</strong></p>
          ${profile?.verificationNote ? `<p>${escapeHtml(profile.verificationNote)}</p>` : ''}
          <button class="button secondary" id="submit-verification" type="button" ${['submitted','under_review','verified'].includes(profile?.verificationStatus) ? 'disabled' : ''}>Submit for verification</button>
          <p id="verification-message" class="microcopy" aria-live="polite"></p>
        </div>
      </section>`;
    document.querySelector('#seller-profile-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const message = document.querySelector('#profile-message');
      try {
        const payload = Object.fromEntries(new FormData(event.currentTarget));
        await api('/seller/profile', { method: 'PATCH', body: JSON.stringify(payload) });
        message.textContent = 'Profile saved.';
        await renderSellerProfile(root);
      } catch (error) { message.textContent = error.body?.error || 'Unable to save profile.'; }
    });
    document.querySelector('#submit-verification')?.addEventListener('click', async (event) => {
      const message = document.querySelector('#verification-message'); event.currentTarget.disabled = true; message.textContent = 'Submitting…';
      try { await api('/seller/profile/submit-verification', { method: 'POST', body: '{}' }); message.textContent = 'Verification submitted.'; await renderSellerProfile(root); }
      catch (error) { message.textContent = error.body?.error || 'Unable to submit verification.'; event.currentTarget.disabled = false; }
    });
  } catch (error) {
    if (error.status === 401) { location.hash = '#/login?return=/seller/profile'; return; }
    root.innerHTML = '<section class="empty-state"><h2>Profile unavailable</h2><p>Please try again shortly.</p></section>';
  }
}
