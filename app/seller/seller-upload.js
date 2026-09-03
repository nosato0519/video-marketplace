function escapeHtml(value = '') {
  return String(value).replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' }[char]));
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
    <header class="seller-header"><div><p class="eyebrow">Creator workspace</p><h1>Upload a video</h1><p>Add your protected video, then turn it into a product draft ready for review and publishing.</p></div><a class="button secondary" href="#/seller/products">My videos</a></header>
    <section class="seller-upload-layout">
      <form id="seller-upload-form" class="seller-upload-card">
        <div class="seller-upload-dropzone"><span class="seller-upload-icon">↑</span><strong>Select your video</strong><span>MP4, WebM, MOV or MKV · up to 5 GB</span><input id="video-file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" required></div>
        <p id="selected-file" class="seller-form__hint">No file selected yet.</p>
        <div class="seller-form__divider"></div>
        <label>Product title<input id="video-title" aria-label="Title" type="text" maxlength="255" placeholder="Give your video a clear title" required></label>
        <label>Description<textarea id="video-description" maxlength="5000" rows="6" placeholder="Tell buyers what they will receive."></textarea></label>
        <div class="seller-form__row"><label>Price (JPY)<input id="video-price" type="number" min="1" step="1" value="1000" required></label><div class="seller-field-note"><span>Currency</span><strong>JPY</strong><small>Japanese Yen</small></div></div>
        <button class="button seller-upload-submit" id="upload-submit" type="submit">Upload and create draft</button>
        <p id="seller-upload-message" class="microcopy" aria-live="polite"></p>
      </form>
      <aside class="seller-upload-info"><p class="eyebrow">Secure delivery</p><h2>Your original file stays protected.</h2><p>The upload is stored behind the application's media access layer. Buyers only receive access after a verified purchase and entitlement check.</p><div class="seller-upload-steps"><div><b>01</b><span>Upload</span></div><div><b>02</b><span>Validate</span></div><div><b>03</b><span>Create draft</span></div></div></aside>
    </section>
  </main>`;

  const form = root.querySelector('#seller-upload-form');
  const fileInput = form.querySelector('#video-file');
  const selectedFile = form.querySelector('#selected-file');
  const message = form.querySelector('#seller-upload-message');
  const submit = form.querySelector('#upload-submit');

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    selectedFile.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'No file selected yet.';
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = fileInput.files?.[0];
    const title = form.querySelector('#video-title').value.trim();
    const description = form.querySelector('#video-description').value.trim();
    const price = Number(form.querySelector('#video-price').value);
    if (!file || !title || !Number.isFinite(price) || price <= 0) {
      message.textContent = 'Choose a video and enter a valid title and price.';
      return;
    }
    submit.disabled = true;
    message.textContent = `Uploading ${file.name}… This can take a while for large videos.`;
    try {
      const media = await request('/api/seller/media/upload', { method: 'POST', headers: { 'content-type': file.type, 'x-original-filename': file.name }, body: file });
      const product = await request('/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, description, priceAmount: price, priceCurrency: 'JPY', mediaAssetId: media.mediaAsset.id }) });
      message.innerHTML = `<span>Draft ${escapeHtml(product.product.title)} created successfully.</span> <a href="#/seller/products">Open My videos</a>`;
      form.reset();
      selectedFile.textContent = 'No file selected yet.';
      form.querySelector('#video-price').value = '1000';
    } catch (error) {
      message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to upload video.';
    } finally {
      submit.disabled = false;
    }
  });
}
