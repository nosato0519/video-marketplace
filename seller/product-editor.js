
const titleInput = document.querySelector('.product-input-card input[type="text"]');
const priceInput = document.querySelector('.product-input-card input[inputmode="numeric"]');
const descriptionInput = document.querySelector('.product-description-card textarea');
const categoryInput = document.querySelector('#product-category');
const translationCards = [...document.querySelectorAll('[data-product-locale]')];
const videoInput = document.querySelector('input[type="file"][accept="video/mp4,video/webm,video/quicktime,video/x-matroska"]');
const imageInputs = [...document.querySelectorAll('input[type="file"][data-product-image-role]')];
const saveAction = document.querySelector('#save-product');
const allowedVideoTypes = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
let maxUploadBytes = 5 * 1024 * 1024 * 1024;
let maxImageUploadBytes = 20 * 1024 * 1024;
let maxUploadLimitLabel = '5 GB';
let isSaving = false;
let isStarting = false;

function parsePrice(value) {
  const normalized = String(value ?? '').trim().replace(/[¥￥,\s]/g, '');
  if (!/^\d+$/.test(normalized)) return 0;
  const amount = Number(normalized);
  return Number.isSafeInteger(amount) ? amount : 0;
}

async function request(path, options = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.error || '保存できませんでした。');
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

function getVideoMime(file) {
  const declaredType = file.type.toLowerCase();
  if (allowedVideoTypes.has(declaredType)) return declaredType;
  const extension = file.name.split('.').pop()?.toLowerCase();
  const mimeByExtension = { mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', mkv: 'video/x-matroska' };
  return mimeByExtension[extension] || '';
}

function uploadMedia(file, mimeType, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/seller/media/upload');
    xhr.withCredentials = true;
    xhr.timeout = 180000;
    xhr.setRequestHeader('Content-Type', mimeType);
    xhr.setRequestHeader('X-Original-Filename', file.name);
    xhr.upload.addEventListener('progress', (event) => {
      if (!event.lengthComputable) return;
      const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
      onProgress(percent);
      if (percent >= 100 && saveAction) {
        saveAction.textContent = '送信完了。ストレージへの保存確認中…';
      }
    });
    xhr.addEventListener('load', () => {
      let body = null;
      try { body = xhr.responseText ? JSON.parse(xhr.responseText) : null; } catch {}
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(body);
        return;
      }
      const error = new Error(body?.error?.message || body?.error || '動画をアップロードできませんでした。');
      error.status = xhr.status;
      error.body = body;
      reject(error);
    });
    xhr.addEventListener('error', () => reject(new Error('動画データ送信後、サーバーとの通信でエラーが発生しました。')));
    xhr.addEventListener('timeout', () => reject(new Error('動画の送信後、サーバー側の保存確認が180秒以内に完了しませんでした。ストレージ設定またはサーバーログの確認が必要です。')));
    xhr.addEventListener('abort', () => reject(new Error('動画アップロードが中断されました。')));
    xhr.send(file);
  });
}

const sellerSessionPromise = (async () => {
  try {
    const session = await request('/api/auth/me');
    if (session.user?.role !== 'seller') {
      window.location.assign('/pages/seller-login.html');
      return false;
    }
    return true;
  } catch {
    window.location.assign('/pages/seller-login.html');
    return false;
  }
})();

const uploadLimitLabel = document.querySelector('#video-upload-limit');
const uploadLimitPromise = request('/api/seller/media/limits').then((limits) => {
  if (!Number.isSafeInteger(limits?.maxUploadBytes) || limits.maxUploadBytes <= 0) {
    throw new Error('invalid_upload_limit_response');
  }
  maxUploadBytes = limits.maxUploadBytes;
  if (!Number.isSafeInteger(limits?.maxImageUploadBytes) || limits.maxImageUploadBytes <= 0) throw new Error('invalid_image_upload_limit_response');
  maxImageUploadBytes = limits.maxImageUploadBytes;
  const gigabytes = maxUploadBytes / (1024 ** 3);
  maxUploadLimitLabel = gigabytes >= 1
    ? `${Number(gigabytes.toFixed(2))} GB`
    : `${Number((maxUploadBytes / (1024 ** 2)).toFixed(1))} MB`;
  if (uploadLimitLabel) uploadLimitLabel.textContent = `販売する動画ファイルをアップロード（上限 ${maxUploadLimitLabel}）`;
  return true;
}).catch((error) => {
  console.error('seller_upload_limit_load_failed', error);
  if (uploadLimitLabel) uploadLimitLabel.textContent = 'アップロード上限を取得できません。ページを再読み込みしてください。';
  return false;
});

async function saveProduct() {
  if (isSaving || isStarting) return;
  isStarting = true;
  const sessionReady = await sellerSessionPromise;
  isStarting = false;
  if (!sessionReady || isSaving) return;
  const uploadLimitReady = await uploadLimitPromise;
  if (!uploadLimitReady) {
    alert('アップロード上限を取得できません。ページを再読み込みしてください。');
    return;
  }

  const title = titleInput?.value.trim() || '';
  const priceAmount = parsePrice(priceInput?.value);
  const file = videoInput?.files?.[0];
  const selectedImages = imageInputs.map((input) => ({ input, file: input.files?.[0] })).filter((item) => item.file);
  const translations = translationCards.map((card) => ({
    locale: card.dataset.productLocale,
    title: card.querySelector('[data-translation-title]')?.value.trim() || '',
    description: card.querySelector('[data-translation-description]')?.value.trim() || ''
  })).filter((translation) => translation.title || translation.description);

  if (!title) {
    titleInput?.focus();
    alert('作品タイトルを入力してください。');
    return;
  }
  if (priceAmount <= 0) {
    priceInput?.focus();
    alert('1円以上の販売価格を入力してください。');
    return;
  }
  if (!file) {
    videoInput?.focus();
    alert('販売する動画ファイルを選択してください。');
    return;
  }
  if (!getVideoMime(file)) {
    videoInput?.focus();
    alert('対応形式は MP4・WebM・MOV・MKV です。');
    return;
  }
  if (file.size === 0) {
    videoInput?.focus();
    alert('空の動画ファイルはアップロードできません。');
    return;
  }
  if (file.size > maxUploadBytes) {
    videoInput?.focus();
    alert(`動画ファイルは${maxUploadLimitLabel}以下にしてください。`);
    return;
  }

  for (const { input, file: imageFile } of selectedImages) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(imageFile.type.toLowerCase())) {
      input.focus();
      alert('画像形式は JPEG・PNG・WebP に対応しています。');
      return;
    }
    if (imageFile.size === 0 || imageFile.size > maxImageUploadBytes) {
      input.focus();
      alert('画像ファイルは空でない、20 MB 以下の JPEG・PNG・WebP を選択してください。');
      return;
    }
  }

  isSaving = true;
  const originalSaveLabel = saveAction?.textContent;
  if (saveAction) saveAction.textContent = 'アップロード・保存中…';
  saveAction?.setAttribute('aria-busy', 'true');
  let uploadedMediaAssetId = null;
  const uploadedImageAssets = [];
  const uploadedAssetIds = [];
  let productCreated = false;
  try {
    const upload = await uploadMedia(file, getVideoMime(file), (percent) => {
      if (saveAction) saveAction.textContent = `アップロード中… ${percent}%`;
    });
    uploadedMediaAssetId = typeof upload?.mediaAsset?.id === 'string' && upload.mediaAsset.id.trim() ? upload.mediaAsset.id : null;
    if (!uploadedMediaAssetId) throw new Error('動画アップロードの応答が不正です。');
    if (upload.mediaAsset.status !== 'ready') throw new Error('アップロードした動画が利用可能な状態ではありません。動画一覧を確認してください。');
    uploadedAssetIds.push(uploadedMediaAssetId);
    for (let index = 0; index < selectedImages.length; index += 1) {
      const { input, file: imageFile } = selectedImages[index];
      if (saveAction) saveAction.textContent = `画像アップロード中… ${index + 1}/${selectedImages.length}`;
      const imageUpload = await uploadMedia(imageFile, imageFile.type.toLowerCase(), () => {});
      const imageAssetId = typeof imageUpload?.mediaAsset?.id === 'string' ? imageUpload.mediaAsset.id.trim() : '';
      if (!imageAssetId || imageUpload.mediaAsset.status !== 'ready') throw new Error('画像アップロードの応答が不正です。');
      uploadedImageAssets.push({
        mediaAssetId: imageAssetId,
        role: input.dataset.productImageRole,
        sortOrder: Number(input.dataset.productImageOrder || 0)
      });
      uploadedAssetIds.push(imageAssetId);
    }
    if (saveAction) saveAction.textContent = '作品情報を保存中…';
    await request('/api/seller/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        description: descriptionInput?.value.trim() || '',
        priceAmount,
        priceCurrency: 'JPY',
        categorySlug: categoryInput?.value || null,
        translations,
        mediaAssetId: uploadedMediaAssetId,
        images: uploadedImageAssets
      })
    });
    productCreated = true;
    window.location.href = '/seller/products.html';
  } catch (error) {
    let productMayExist = productCreated;
    let cleanupPending = false;
    if (uploadedAssetIds.length && !productCreated) {
      for (const assetId of uploadedAssetIds.reverse()) {
        try {
          await request(`/api/seller/media/assets/${encodeURIComponent(assetId)}`, { method: 'DELETE' });
        } catch (cleanupError) {
          if (cleanupError.status === 409 && cleanupError.body?.error === 'media_asset_in_use') {
            productMayExist = true;
          } else {
            cleanupPending = true;
            console.error('seller_product_create_cleanup_failed', cleanupError);
            if (error.status >= 500 || !error.status) productMayExist = true;
          }
        }
      }
    }
    if (error.status === 401 || error.status === 403) {
      window.location.href = '/pages/seller-login.html';
      return;
    }
    if (productMayExist) {
      alert('下書きが作成されている可能性があります。重複登録を避けるため、動画管理で確認してください。');
      window.location.href = '/seller/products.html';
      return;
    }
    if (cleanupPending) {
      alert('作品登録は完了しませんでしたが、アップロードした動画の削除が完了していません。動画管理ページで「削除を再試行」してください。');
      window.location.href = '/seller/products.html';
      return;
    }
    const detail = error.body?.error?.message || error.body?.error || error.message;
    alert(typeof detail === 'string' ? detail : '動画を保存できませんでした。');
  } finally {
    isSaving = false;
    if (saveAction && originalSaveLabel !== undefined) saveAction.textContent = originalSaveLabel;
    saveAction?.removeAttribute('aria-busy');
  }
}

saveAction?.addEventListener('click', async () => {
  if (isSaving || isStarting) return;

  saveAction.disabled = true;
  saveAction.setAttribute('aria-busy', 'true');
  saveAction.textContent = 'ログイン状態を確認中…';

  try {
    await saveProduct();
  } catch (error) {
    console.error('seller_product_save_unhandled_error', error);
    alert('保存処理を開始できませんでした。ページを再読み込みして再試行してください。');
  } finally {
    saveAction.disabled = false;
    saveAction.removeAttribute('aria-busy');
    saveAction.textContent = '下書きを保存する →';
  }
});
