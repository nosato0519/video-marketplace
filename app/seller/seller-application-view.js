async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) { const error = new Error(body?.error || body?.message || 'request_failed'); error.status = response.status; error.body = body; throw error; }
  return body;
}

const esc = (value) => String(value ?? '').replace(/[&<>\"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#39;' }[c]));
const statusText = { pending:'Pending review', under_review:'Under review', approved:'Approved', rejected:'Rejected', withdrawn:'Withdrawn' };

export async function renderSellerApplication(root) {
  root.innerHTML = '<section class="page-section"><div class="card"><p>Loading seller application…</p></div></section>';
  try {
    const me = await api('/auth/me');
    if (me.user?.role === 'seller') {
      root.innerHTML = '<section class="page-section"><div class="card"><p class="eyebrow">Seller</p><h1>You are already a seller</h1><p>Your seller account is active. Continue to your dashboard to manage products and earnings.</p><a class="button" href="#/seller">Open seller dashboard</a></div></section>';
      return;
    }
    if (me.user?.role !== 'buyer') {
      root.innerHTML = '<section class="empty-state"><h2>Seller registration unavailable</h2><p>This account cannot submit a seller application.</p></section>';
      return;
    }
    const { application } = await api('/seller/application');
    if (application) {
      root.innerHTML = `<section class="page-section"><div class="section-heading"><div><p class="eyebrow">Become a seller</p><h1>Seller application</h1><p>Your application is being handled securely by the marketplace team.</p></div></div><div class="card"><p>Status</p><h2>${esc(statusText[application.status] || application.status)}</h2><dl><dt>Display name</dt><dd>${esc(application.display_name)}</dd><dt>Legal name</dt><dd>${esc(application.legal_name)}</dd><dt>Country</dt><dd>${esc(application.country_code)}</dd></dl>${application.review_note ? `<p class="microcopy">Review note: ${esc(application.review_note)}</p>` : ''}${['pending','under_review'].includes(application.status) ? '<button class="button secondary" id="withdraw-application" type="button">Withdraw application</button>' : ''}<p id="application-message" class="microcopy" aria-live="polite"></p></div></section>`;
      root.querySelector('#withdraw-application')?.addEventListener('click', async (event) => {
        const message = root.querySelector('#application-message'); event.currentTarget.disabled = true; message.textContent = 'Withdrawing…';
        try { await api('/seller/application/withdraw', { method: 'POST', body: '{}' }); await renderSellerApplication(root); }
        catch (error) { message.textContent = error.body?.error || 'Unable to withdraw application.'; event.currentTarget.disabled = false; }
      });
      return;
    }
    root.innerHTML = `<section class="page-section"><div class="section-heading"><div><p class="eyebrow">Become a seller</p><h1>Start selling your videos</h1><p>Submit your seller application. Approval is required before seller privileges are granted.</p></div></div><div class="card"><form id="seller-application-form"><label>Display name<input name="displayName" maxlength="120" required autocomplete="nickname"></label><label>Legal name<input name="legalName" maxlength="200" required autocomplete="name"></label><label>Country code<input name="countryCode" maxlength="2" minlength="2" pattern="[A-Za-z]{2}" required placeholder="JP" autocomplete="country"></label><label>Message <span class="microcopy">Optional</span><textarea name="message" maxlength="1000" rows="5" placeholder="Tell us what you plan to sell."></textarea></label><button class="button" type="submit">Submit application</button><p id="application-message" class="microcopy" aria-live="polite"></p></form></div><div class="card"><h2>What happens next?</h2><p>We review your application before enabling seller tools. Approval does not replace any required identity or payout verification.</p></div></section>`;
    root.querySelector('#seller-application-form').addEventListener('submit', async (event) => {
      event.preventDefault(); const form = event.currentTarget; const button = form.querySelector('button'); const message = form.querySelector('#application-message'); button.disabled = true; message.textContent = 'Submitting…';
      try { await api('/seller/application', { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); await renderSellerApplication(root); }
      catch (error) { message.textContent = error.body?.error || 'Unable to submit application.'; button.disabled = false; }
    });
  } catch (error) {
    root.innerHTML = error.status === 401 ? '<section class="empty-state"><h2>Login required</h2><p>Please log in before applying to become a seller.</p><a class="button" href="#/login?return=/seller/register">Log in</a></section>' : '<section class="empty-state"><h2>Seller registration unavailable</h2><p>Please try again shortly.</p></section>';
  }
}
