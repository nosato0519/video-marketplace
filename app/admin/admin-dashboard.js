const sections = [
  ['overview', 'Overview', 'Sales, orders and important alerts'],
  ['products', 'Products', 'Create, edit, publish or pause products'],
  ['sellers', 'Sellers', 'Review sellers and verification status'],
  ['seller-applications', 'Seller applications', 'Review creator applications before granting seller privileges'],
  ['orders', 'Orders & sales', 'Review orders, refunds and revenue'],
  ['payouts', 'Payouts', 'Review seller payout requests'],
  ['moderation', 'Moderation', 'Review content and reports'],
  ['localization', 'Languages & currencies', 'Manage supported locales and currencies'],
  ['regions', 'Regions', 'Control country availability'],
  ['settings', 'Settings', 'Manage site configuration'],
  ['activity', 'Security & activity', 'Review important administrative actions'],
  ['help', 'Help', 'Guided help and troubleshooting']
];

export function renderAdminDashboard() {
  return `<main class="admin-shell">
    <header class="admin-header">
      <div><p class="eyebrow">Operator</p><h1>Admin dashboard</h1><p>Routine marketplace management without code.</p></div>
      <a class="button secondary" href="#/">View site</a>
    </header>
    <section class="admin-alert" aria-live="polite">
      <strong>Action queue</strong>
      <span>Review pending moderation, seller applications and payout requests first.</span>
    </section>
    <section class="admin-stats" aria-label="Overview">
      <article><span>Today’s sales</span><strong>Not connected</strong></article>
      <article><span>Pending review</span><strong>Not connected</strong></article>
      <article><span>Payout requests</span><strong>Not connected</strong></article>
      <article><span>System status</span><strong>Not checked</strong></article>
    </section>
    <section class="admin-grid" aria-label="Management sections">
      ${sections.map(([id, title, description]) => `<a class="admin-card" href="#/admin/${id}"><strong>${title}</strong><span>${description}</span></a>`).join('')}
    </section>
    <p class="admin-footnote">Dashboard metrics remain explicitly unavailable until their authenticated live-data endpoints and health checks are wired. Never display placeholder values as real production status.</p>
  </main>`;
}
