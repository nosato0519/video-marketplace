const sellerSections = [
  ['overview', 'Overview', 'Sales, views and important tasks'],
  ['products', 'My videos', 'Create, edit and submit products'],
  ['upload', 'Upload video', 'Resumable upload and processing status'],
  ['sales', 'Sales & earnings', 'Understand gross sales, fees and net earnings'],
  ['payouts', 'Payouts', 'Review available balance and payout requests'],
  ['profile', 'Seller profile', 'Public profile and verification status'],
  ['help', 'Seller help', 'Guided setup and troubleshooting']
];

export function renderSellerDashboard() {
  return `<main class="seller-shell">
    <header class="seller-header">
      <div><p class="eyebrow">Creator</p><h1>Seller dashboard</h1><p>Manage your video business from desktop or mobile.</p></div>
      <a class="button secondary" href="#/seller/upload">Upload video</a>
    </header>
    <section class="seller-stats" aria-label="Seller overview">
      <article><span>This month</span><strong>—</strong></article>
      <article><span>Available balance</span><strong>—</strong></article>
      <article><span>Pending review</span><strong>—</strong></article>
    </section>
    <section class="seller-grid">
      ${sellerSections.map(([id, title, description]) => `<a class="seller-card" href="#/seller/${id}"><strong>${title}</strong><span>${description}</span></a>`).join('')}
    </section>
  </main>`;
}
