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

function uploadVideo(file, mimeType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/seller/media/upload');
    xhr.withCredentials = true;
    xhr.timeout = 180000;
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('X-Original-Filename', encodeURIComponent(file.name));
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
    });
    xhr.addEventListener('load', () => {
      let body = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      const error = new Error(body?.error?.message || body?.error || 'Unable to upload video.');
      error.status = xhr.status;
      error.body = body;
      reject(error);
    });
    xhr.addEventListener('error', () => reject(new Error('Network error while uploading video.')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload did not finish within 180 seconds. Check the storage configuration before retrying.')));
    xhr.addEventListener('abort', () => reject(new Error('Video upload was interrupted.')));
    xhr.send(file);
  });
}

export async function renderSellerUpload(root) {
  root.innerHTML = `<main class="seller-shell">
    <header class="seller-header"><div><p class="eyebrow">Creator workspace</p><h1>Upload video</h1><p>Add your protected video, then turn it into a product draft ready for review and publishing.</p></div><a class="button secondary" href="#/seller/products">My videos</a></header>
    <section class="seller-upload-layout">
      <form id="seller-upload-form" class="seller-upload-card">
        <div class="seller-upload-dropzone"><span class="seller-upload-icon">↑</span><strong>Select your video</strong><span id="video-upload-limit">MP4, WebM, MOV or MKV · up to 5 GB</span><input id="video-file" aria-label="Video file" type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" required></div>
        <p id="selected-file" class="seller-form__hint">No file selected yet.</p>
        <label>Thumbnail image<input id="thumbnail-file" aria-label="Thumbnail image" type="file" accept="image/jpeg,image/png,image/webp" required></label>
        <p id="selected-thumbnail" class="seller-form__hint">No thumbnail selected yet.</p>
        <div class="seller-form__divider"></div>
        <label>Product title<input id="video-title" aria-label="Title" type="text" maxlength="255" placeholder="Give your video a clear title" required></label>
        <label>Description<textarea id="video-description" aria-label="Description" maxlength="5000" rows="6" placeholder="Tell buyers what they will receive."></textarea></label>
        <div class="seller-form__row"><label>Price (JPY)<input id="video-price" aria-label="Price (JPY)" type="number" min="1" step="1" value="1000" required></label><div class="seller-field-note"><span>Currency</span><strong>JPY</strong><small>Japanese Yen</small></div></div>
        <button class="button seller-upload-submit" id="upload-submit" type="submit">Upload and create draft</button>
        <p id="seller-upload-message" class="microcopy" aria-live="polite"></p>
      </form>
      <aside class="seller-upload-info"><p class="eyebrow">Secure delivery</p><h2>Your original file stays protected.</h2><p>The upload is stored behind the application's media access layer. Buyers only receive access after a verified purchase and entitlement check.</p><div class="seller-upload-steps"><div><b>01</b><span>Upload</span></div><div><b>02</b><span>Validate</span></div><div><b>03</b><span>Create draft</span></div></div></aside>
    </section>
  </main>`;

  const form = root.querySelector('#seller-upload-form');
  const fileInput = form.querySelector('#video-file');
  const selectedFile = form.querySelector('#selected-file');
  const thumbnailInput = form.querySelector('#thumbnail-file');
  const selectedThumbnail = form.querySelector('#selected-thumbnail');
  const message = form.querySelector('#seller-upload-message');
  const submit = form.querySelector('#upload-submit');
  const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
  const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
  const maxImageUploadBytes = 20 * 1024 * 1024;
  let maxUploadBytes = 5 * 1024 * 1024 * 1024;
  let uploadLimitLoaded = false;
  const uploadLimitLabel = form.querySelector('#video-upload-limit');
  const formatBytes = (bytes) => {
    const gb = bytes / (1024 ** 3);
    return gb >= 1 ? `${Number(gb.toFixed(2))} GB` : `${Number((bytes / (1024 ** 2)).toFixed(1))} MB`;
  };
  submit.disabled = true;
  request('/api/seller/media/limits').then((limits) => {
    if (!Number.isSafeInteger(limits?.maxUploadBytes) || limits.maxUploadBytes <= 0) {
      throw new Error('Invalid upload limit response.');
    }
    maxUploadBytes = limits.maxUploadBytes;
    uploadLimitLoaded = true;
    uploadLimitLabel.textContent = `MP4, WebM, MOV or MKV · up to ${formatBytes(maxUploadBytes)}`;
    submit.disabled = false;
  }).catch(() => {
    message.textContent = 'Unable to load the upload limit. Refresh this page before uploading.';
    submit.disabled = true;
  });

  function getVideoMime(file) {
    const declaredType = file.type.toLowerCase();
    if (allowedVideoTypes.has(declaredType)) return declaredType;
    const extension = file.name.split('.').pop()?.toLowerCase();
    const mimeByExtension = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska' };
    return mimeByExtension[extension] || '';
  }

  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    selectedFile.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'No file selected yet.';
  });

  thumbnailInput.addEventListener('change', () => {
    const file = thumbnailInput.files?.[0];
    selectedThumbnail.textContent = file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : 'No thumbnail selected yet.';
  });

  let isUploading = false;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isUploading) return;
    const file = fileInput.files?.[0];
    const thumbnailFile = thumbnailInput.files?.[0];
    const title = form.querySelector('#video-title').value.trim();
    const description = form.querySelector('#video-description').value.trim();
    const price = Number(form.querySelector('#video-price').value);
    if (!uploadLimitLoaded) {
      message.textContent = 'Unable to load the upload limit. Refresh this page before uploading.';
      submit.disabled = true;
      return;
    }
    if (!file || !thumbnailFile || !title || !Number.isSafeInteger(price) || price <= 0) {
      message.textContent = 'Choose a video, upload a thumbnail image, and enter a valid title and positive whole-number price.';
      if (!thumbnailFile) thumbnailInput.focus();
      return;
    }
    if (!allowedImageTypes.has(thumbnailFile.type.toLowerCase()) || thumbnailFile.size === 0 || thumbnailFile.size > maxImageUploadBytes) {
      message.textContent = 'Choose a non-empty JPEG, PNG, or WebP thumbnail no larger than 20 MB.';
      thumbnailInput.focus();
      return;
    }
    if (!getVideoMime(file)) {
      message.textContent = 'Unsupported video format. Choose MP4, WebM, MOV, or MKV.';
      fileInput.focus();
      return;
    }
    if (file.size === 0) {
      message.textContent = 'The selected video file is empty.';
      fileInput.focus();
      return;
    }
    if (file.size > maxUploadBytes) {
      message.textContent = `The video exceeds the ${formatBytes(maxUploadBytes)} upload limit.`;
      fileInput.focus();
      return;
    }
    isUploading = true;
    submit.disabled = true;
    message.textContent = `Uploading ${file.name}… This can take a while for large videos.`;
    const uploadedAssetIds = [];
    let productCreated = false;
    try {
      const media = await uploadVideo(file, getVideoMime(file), (percent) => { message.textContent = `Uploading ${file.name}… ${percent}%`; });
      const mediaAssetId = typeof media?.mediaAsset?.id === 'string' && media.mediaAsset.id.trim() ? media.mediaAsset.id.trim() : null;
      if (!mediaAssetId) {
        throw new Error('Upload response did not include a media asset ID. Check My videos before uploading again.');
      }
      uploadedAssetIds.push(mediaAssetId);
      if (media.mediaAsset.status !== 'ready') {
        throw new Error('The uploaded video is not ready to register. Check My videos before uploading again.');
      }
      message.textContent = 'Uploading thumbnail image…';
      const thumbnailUpload = await uploadVideo(thumbnailFile, thumbnailFile.type.toLowerCase(), () => {});
      const thumbnailAssetId = typeof thumbnailUpload?.mediaAsset?.id === 'string' && thumbnailUpload.mediaAsset.id.trim()
        ? thumbnailUpload.mediaAsset.id.trim()
        : null;
      if (!thumbnailAssetId || thumbnailUpload.mediaAsset.status !== 'ready') {
        throw new Error('Thumbnail upload did not return a ready media asset.');
      }
      uploadedAssetIds.push(thumbnailAssetId);
      const product = await request('/api/seller/products', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          priceAmount: price,
          priceCurrency: 'JPY',
          mediaAssetId: mediaAssetId,
          images: [{ mediaAssetId: thumbnailAssetId, role: 'thumbnail', sortOrder: 0 }]
        })
      });
      productCreated = true;
      message.innerHTML = `<span>Draft ${escapeHtml(product.product.title)} created successfully.</span> <a href="#/seller/products">Open My videos</a>`;
      form.reset();
      selectedFile.textContent = 'No file selected yet.';
      form.querySelector('#video-price').value = '1000';
    } catch (error) {
      let productWasCreated = productCreated;
      if (!productCreated) {
        for (const assetId of uploadedAssetIds.reverse()) {
          try {
            await request(`/api/seller/media/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
          } catch (cleanupError) {
            if (cleanupError.status === 409 && cleanupError.body?.error === 'media_asset_in_use') {
              productWasCreated = true;
            } else {
              console.error('seller_upload_cleanup_failed', cleanupError);
            }
          }
        }
      }
      if (productWasCreated) {
        message.innerHTML = `The draft appears to have been created. Check <a href="#/seller/products">My videos</a> before trying again.`;
      } else {
        message.textContent = error.body?.error?.message || error.body?.error || error.message || 'Unable to upload video.';
      }
    } finally {
      isUploading = false;
      submit.disabled = !uploadLimitLoaded;
    }
  });
}