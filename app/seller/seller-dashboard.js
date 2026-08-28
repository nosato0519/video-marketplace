const sellerSections = [
  ['overview', 'Overview', 'Sales, views and important tasks'],
  ['products', 'My videos', 'Create, edit and submit products'],
  ['upload', 'Upload video', 'Upload a video and create a product draft'],
  ['sales', 'Sales & earnings', 'Understand gross sales, fees and net earnings'],
  ['payouts', 'Payouts', 'Review available balance and payout requests'],
  ['profile', 'Seller profile', 'Public profile and verification status'],
  ['help', 'Seller help', 'Guided setup and troubleshooting']
];

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || 'Request failed');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function renderUpload() {
  return `<main class="seller-shell">
    <header class="seller-header"><div><p class="eyebrow">Creator</p><h1>Upload video</h1><p>Upload a video and create a product draft.</p></div><a class="button secondary" href="#/seller/products">My videos</a></header>
    <form id="seller-upload-form" class="seller-card">
      <label>Video file<input id="video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" required></label>
      <label>Title<input id="video-title" type="text" maxlength="255" required></label>
      <label>Description<textarea id="video-description" maxlength="5000" rows="5"></textarea></label>
      <label>Price (JPY)<input id="video-price" type="number" min="1" step="1" value="1000" required></label>
      <button class="button" id="upload-submit" type="submit">Upload and create draft</button>
      <p id="seller-upload-message" class="microcopy" aria-live="polite"></p>
    </form>
  </main>`;
}

function wireUpload() {
  const form = document.querySelector('#seller-upload-form');
  if (!form) return;
  const fileInput = form.querySelector('#video-file');
  const message = form.querySelector('#seller-upload-message');
  const submit = form.querySelector('#upload-submit');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    if (!file) return;
    submit.disabled = true;
    message.textContent = `Uploading ${file.name}…`;
    try {
      const media = await request('/api/seller/media/upload', {
        method: 'POST',
        headers: { 'content-type': file.type, 'x-original-filename': file.name },
        body: file
      });
      message.textContent = 'Upload complete. Creating product draft…';
      const product = await request('/api/seller/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.querySelector('#video-title').value.trim(),
          description: form.querySelector('#video-description').value.trim(),
          priceAmount: Number(form.querySelector('#video-price').value),
          priceCurrency: 'JPY',
          mediaAssetId: media.mediaAsset.id
        })
      });
      message.innerHTML = `Draft <strong>${escapeHtml(product.product.title)}</strong> created successfully. <a href="#/seller/products">Open My videos</a>`;
      form.reset();
      form.querySelector('#video-price').value = '1000';
    } catch (error) {
      message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to upload video.';
    } finally {
      submit.disabled = false;
    }
  });
}

export function renderSellerDashboard() {
  if (location.hash.split('?')[0] === '#/seller/upload') {
    queueMicrotask(wireUpload);
    return renderUpload();
  }
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
