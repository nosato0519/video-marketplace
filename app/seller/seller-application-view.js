export async function renderSellerApplication(root) {
  try {
    const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.user?.role === 'seller') {
      root.innerHTML = `
        <section class="page-section">
          <div class="card">
            <p class="eyebrow">Seller</p>
            <h1>You are already a seller</h1>
            <p>Your seller account is active. Continue to your dashboard to manage products and earnings.</p>
            <a class="button" href="#/seller">Open seller dashboard</a>
          </div>
        </section>
      `;
      return;
    }
  } catch {
    // The dedicated registration page handles connection errors.
  }

  window.location.assign('/pages/seller-register.html');
}
