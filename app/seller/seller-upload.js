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

export async function renderSellerUpload(root) {
  root.innerHTML = `<main class="seller-shell">
    <header class="seller-header"><div><p class="eyebrow">Creator</p><h1>Upload video</h1><p>Upload a video, create its product draft, then publish it from My videos.</p></div><a class="button secondary" href="#/seller/products">My videos</a></header>
    <form id="seller-upload-form" class="seller-card" enctype="multipart/form-data">
      <label>Video file<input id="video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" required></label>
      <label>Title<input id="video-title" type="text" maxlength="255" required></label>
      <label>Description<textarea id="video-description" maxlength="5000" rows="5"></textarea></label>
      <label>Price (JPY)<input id="video-price" type="number" min="1" step="1" value="1000" required></label>
      <button class="button" id="upload-submit" type="submit">Upload and create draft</button>
      <p id="seller-upload-message" class="microcopy" aria-live="polite"></p>
    </form>
  </main>`;

  const form = root.querySelector('#seller-upload-form');
  const fileInput = root.querySelector('#video-file');
  const message = root.querySelector('#seller-upload-message');
  const submit = root.querySelector('#upload-submit');

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
          title: root.querySelector('#video-title').value.trim(),
          description: root.querySelector('#video-description').value.trim(),
          priceAmount: Number(root.querySelector('#video-price').value),
          priceCurrency: 'JPY',
          mediaAssetId: media.mediaAsset.id
        })
      });
      message.innerHTML = `Draft <strong>${escapeHtml(product.product.title)}</strong> created successfully. <a href="#/seller/products">Open My videos</a>`;
      form.reset();
      root.querySelector('#video-price').value = '1000';
    } catch (error) {
      message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to upload video.';
    } finally {
      submit.disabled = false;
    }
  });
}
