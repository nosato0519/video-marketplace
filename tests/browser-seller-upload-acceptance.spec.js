import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }),
    });
  });
  await page.route('**/api/seller/media/limits', async (route) => {
    await fulfillJson(route, {
      maxUploadBytes: 5 * 1024 * 1024 * 1024,
      maxImageUploadBytes: 20 * 1024 * 1024,
    });
  });
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('seller upload browser acceptance', () => {
  test('seller product editor becomes ready after the seller session resolves', async ({ page }) => {
    let releaseSession;
    const sessionGate = new Promise((resolve) => { releaseSession = resolve; });
    await page.route('**/api/auth/me', async (route) => {
      await sessionGate;
      await fulfillJson(route, { user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } });
    });
    await page.route('**/api/seller/media/limits', async (route) => {
      await fulfillJson(route, {
        maxUploadBytes: 5 * 1024 * 1024 * 1024,
        maxImageUploadBytes: 20 * 1024 * 1024,
      });
    });

    await page.goto('/seller/product-editor.html');
    releaseSession();
    await expect(page.getByRole('heading', { name: '新しい動画を登録する' })).toBeVisible();
    await expect(page.locator('#save-product')).toBeVisible();
  });

test('disables the save action while a video upload is pending', async ({ page }) => {
    await mockSellerSession(page);
    let releaseUpload;
    const uploadGate = new Promise((resolve) => { releaseUpload = resolve; });
    let uploadCalls = 0;
    let thumbnailCalls = 0;
    let draftCalls = 0;

    await page.route('**/api/seller/media/upload', async (route) => {
      const contentType = route.request().headers()['content-type'];
      if (contentType === 'image/jpeg') {
        thumbnailCalls += 1;
        await fulfillJson(route, { mediaAsset: { id: 'thumbnail-pending-save', status: 'ready' } }, 201);
        return;
      }
      uploadCalls += 1;
      await uploadGate;
      await fulfillJson(route, { mediaAsset: { id: 'media-pending-save', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') {
        draftCalls += 1;
        await fulfillJson(route, { product: { id: 'draft-pending-save', title: 'Pending Save', status: 'draft' } }, 201);
      } else {
        await route.fallback();
      }
    });

    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Pending Save');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'pending-save.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });

    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });

    const saveAction = page.locator('#save-product');
    try {
      await saveAction.click();
      await expect.poll(() => uploadCalls).toBe(1);
      await expect(saveAction).toHaveAttribute('aria-busy', 'true');
      await saveAction.dispatchEvent('click');
      expect(uploadCalls).toBe(1);
      expect(draftCalls).toBe(0);
    } finally {
      releaseUpload();
    }
    await expect(page).toHaveURL(/\/seller\/products\.html$/);
    expect(uploadCalls).toBe(1);
    expect(thumbnailCalls).toBe(1);
    expect(draftCalls).toBe(1);
  });

  test('seller can upload a video and save a draft from the production-linked editor page', async ({ page }) => {
    await mockSellerSession(page);

    let uploaded = false;
    let draftCreated = false;

    await page.route('**/api/seller/media/upload', async (route) => {
      expect(route.request().method()).toBe('POST');
      if (route.request().headers()['content-type'] === 'image/jpeg') {
        await fulfillJson(route, { mediaAsset: { id: 'thumbnail-product-editor', status: 'ready' } }, 201);
        return;
      }
      expect(route.request().headers()['content-type']).toBe('video/mp4');
      expect(route.request().headers()['x-original-filename']).toBe('product-editor.mp4');
      expect(route.request().postDataBuffer()?.length || 0).toBeGreaterThan(0);
      uploaded = true;
      await fulfillJson(route, { mediaAsset: { id: 'media-product-editor', status: 'ready' } }, 201);
    });

    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body.title).toBe('Product Editor Video');
      expect(body.description).toBe('Saved through the seller page linked from the dashboard.');
      expect(body.priceAmount).toBe(1800);
      expect(body.priceCurrency).toBe('JPY');
      expect(body.mediaAssetId).toBe('media-product-editor');
      draftCreated = true;
      await fulfillJson(route, { product: { id: 'product-editor-draft', title: body.title, status: 'draft' } }, 201);
    });

    await page.goto('/seller/product-editor.html');
    await expect(page.getByRole('heading', { name: '新しい動画を登録する' })).toBeVisible();
    await page.locator('.product-input-card input[type="text"]').first().fill('Product Editor Video');
    await page.locator('.product-description-card textarea').fill('Saved through the seller page linked from the dashboard.');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'product-editor.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });

    await page.locator('#save-product').click();

    await expect(page).toHaveURL(/\/seller\/products\.html$/);
    expect(uploaded).toBe(true);
    expect(draftCreated).toBe(true);
  });

  test('does not create a draft when the upload response has no media asset id', async ({ page }) => {
    await mockSellerSession(page);
    let draftCalls = 0;
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') draftCalls += 1;
      await fulfillJson(route, { products: [] });
    });

    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Malformed Upload Response');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'malformed-response.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });

    await page.locator('#save-product').click();
    expect(draftCalls).toBe(0);
    await expect(page.locator('#save-product')).not.toHaveAttribute('aria-busy', 'true');
  });

  test('product editor infers MIME type when browser reports a blank type', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/media/upload', async (route) => {
      if (route.request().headers()['content-type'] === 'image/jpeg') {
        await fulfillJson(route, { mediaAsset: { id: 'thumbnail-blank-mime', status: 'ready' } }, 201);
        return;
      }
      expect(route.request().headers()['content-type']).toBe('video/mp4');
      await fulfillJson(route, { mediaAsset: { id: 'media-blank-mime', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().postDataJSON().mediaAssetId).toBe('media-blank-mime');
      await fulfillJson(route, { product: { id: 'product-blank-mime', status: 'draft' } }, 201);
    });

    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Blank MIME Video');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'blank-mime.mp4',
      mimeType: '',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });
    await page.locator('#save-product').click();
    await expect(page).toHaveURL(/\/seller\/products\.html$/);
  });

  test('dashboard-linked editor avoids duplicate registration after an ambiguous create response', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'media-editor-ambiguous', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') {
        await fulfillJson(route, { error: 'upstream_response_lost' }, 502);
      } else {
        await fulfillJson(route, { products: [] });
      }
    });
    await page.route('**/api/seller/media/assets/media-editor-ambiguous', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await fulfillJson(route, { error: 'media_storage_unavailable' }, 503);
    });

    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Ambiguous Editor Draft');
    await page.locator('.product-description-card textarea').fill('Recover without duplicate creation.');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'ambiguous-editor.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });
    await page.locator('#save-product').click();
    await expect(page).toHaveURL(/\/seller\/products\.html$/);
  });

  test('seller can upload a video and create a product draft', async ({ page }) => {
    await mockSellerSession(page);

    let uploaded = false;
    let draftCreated = false;

    await page.route('**/api/seller/media/upload', async (route) => {
      expect(route.request().method()).toBe('POST');
      if (route.request().headers()['content-type'] === 'image/jpeg') {
        await fulfillJson(route, { mediaAsset: { id: 'thumbnail-media-1', status: 'ready' } }, 201);
        return;
      }
      expect(route.request().headers()['content-type']).toBe('video/mp4');
      expect(route.request().headers()['x-original-filename']).toBe('sample.mp4');
      expect(route.request().postDataBuffer()?.length || 0).toBeGreaterThan(0);
      uploaded = true;
      await fulfillJson(route, { mediaAsset: { id: 'media-1', status: 'ready' } });
    });

    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body.title).toBe('Sample Video');
      expect(body.description).toBe('Uploaded from browser acceptance.');
      expect(body.priceAmount).toBe(1500);
      expect(body.priceCurrency).toBe('JPY');
      expect(body.mediaAssetId).toBe('media-1');
      draftCreated = true;
      await fulfillJson(route, { product: { id: 'product-1', title: 'Sample Video', status: 'draft' } });
    });

    await page.goto(appUrl('#/seller/upload'));
    await expect(page.getByRole('heading', { name: 'Upload video' })).toBeVisible();

    await page.locator('#video-file').setInputFiles({
      name: 'sample.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4-test-payload'),
    });
    await page.getByLabel('Title').fill('Sample Video');
    await page.getByLabel('Description').fill('Uploaded from browser acceptance.');
    await page.getByLabel('Price (JPY)').fill('1500');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();

    await expect(page.getByText('Draft Sample Video created successfully.')).toBeVisible();
    expect(uploaded).toBe(true);
    expect(draftCreated).toBe(true);
  });

  test('does not create a draft when the SPA upload response omits the media asset id', async ({ page }) => {
    await mockSellerSession(page);
    let productCalls = 0;
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') productCalls += 1;
      await fulfillJson(route, { products: [] });
    });

    await page.goto(appUrl('#/seller/upload'));
    await page.locator('#video-file').setInputFiles({
      name: 'missing-asset-id.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4-test-payload'),
    });
    await page.getByLabel('Title').fill('Missing media asset ID');
    await page.getByLabel('Price (JPY)').fill('1000');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();

    await expect(page.getByText(/Upload response did not include a media asset ID/)).toBeVisible();
    expect(productCalls).toBe(0);
  });

  test('cleans up and does not register an upload that is not ready', async ({ page }) => {
    await mockSellerSession(page);
    let productCalls = 0;
    let cleanupCalled = false;
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'media-not-ready', status: 'processing' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') productCalls += 1;
      await fulfillJson(route, { products: [] });
    });
    await page.route('**/api/seller/media/assets/media-not-ready', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      cleanupCalled = true;
      await route.fulfill({ status: 204, body: '' });
    });

    await page.goto(appUrl('#/seller/upload'));
    await page.locator('#video-file').setInputFiles({
      name: 'not-ready.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4-test-payload'),
    });
    await page.getByLabel('Title').fill('Video not ready');
    await page.getByLabel('Price (JPY)').fill('1000');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();

    await expect(page.getByText(/uploaded video is not ready to register/i)).toBeVisible();
    expect(productCalls).toBe(0);
    expect(cleanupCalled).toBe(true);
  });

  test('shows My videos recovery guidance when draft creation response is ambiguous', async ({ page }) => {
    await mockSellerSession(page);

    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'media-ambiguous', status: 'ready' } }, 201);
    });

    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      await fulfillJson(route, { error: 'upstream_response_lost' }, 502);
    });

    await page.route('**/api/seller/media/assets/media-ambiguous', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await fulfillJson(route, { error: 'media_asset_in_use' }, 409);
    });

    await page.goto(appUrl('#/seller/upload'));
    await page.locator('#video-file').setInputFiles({
      name: 'sample.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4-test-payload'),
    });
    await page.getByLabel('Title').fill('Sample Video');
    await page.getByLabel('Description').fill('Uploaded from browser acceptance.');
    await page.getByLabel('Price (JPY)').fill('1500');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();

    await expect(page.getByText('The draft appears to have been created. Check')).toBeVisible();
    await expect(page.locator('#seller-upload-message').getByRole('link', { name: 'My videos' })).toHaveAttribute('href', '#/seller/products');
  });

  test('cleans up an uploaded video when draft creation is definitively rejected', async ({ page }) => {
    await mockSellerSession(page);
    let cleanupCalled = false;
    let alertMessage = '';
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'media-rejected-draft', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      await fulfillJson(route, { error: 'invalid_product_data' }, 422);
    });
    await page.route('**/api/seller/media/assets/media-rejected-draft', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      cleanupCalled = true;
      await route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Rejected draft');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'rejected-draft.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });
    await page.locator('#save-product').click();

    await expect.poll(() => cleanupCalled).toBe(true);
    expect(alertMessage).toContain('invalid_product_data');
    await expect(page).toHaveURL(/\/seller\/product-editor\.html$/);
  });

  test('routes to video management when a rejected draft leaves cleanup pending', async ({ page }) => {
    await mockSellerSession(page);
    let alertMessage = '';
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'media-cleanup-pending', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      await fulfillJson(route, { error: 'invalid_product_data' }, 422);
    });
    await page.route('**/api/seller/media/assets/media-cleanup-pending', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await fulfillJson(route, { error: 'media_storage_unavailable' }, 503);
    });
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto('/seller/product-editor.html');
    await page.locator('.product-input-card input[type="text"]').first().fill('Rejected draft cleanup');
    await page.locator('.product-input-card input[inputmode="numeric"]').fill('1800');
    await page.getByLabel('動画ファイル').setInputFiles({
      name: 'cleanup-pending.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('サムネイル画像').setInputFiles({
      name: 'thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });
    await page.locator('#save-product').click();

    await expect(page).toHaveURL(/\/seller\/products\.html$/);
    expect(alertMessage).toContain('削除を再試行');
  });

  test('rejects an unsupported file before starting an upload', async ({ page }) => {
    await mockSellerSession(page);
    let uploadCalls = 0;
    await page.route('**/api/seller/media/upload', async (route) => {
      uploadCalls += 1;
      await fulfillJson(route, { mediaAsset: { id: 'unexpected' } }, 201);
    });
    await page.goto(appUrl('#/seller/upload'));
    await page.locator('#video-file').setInputFiles({
      name: 'notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('not a video'),
    });
    await page.getByLabel('Title').fill('Unsupported file');
    await page.getByLabel('Price (JPY)').fill('1000');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();
    await expect(page.getByText('Unsupported video format. Choose MP4, WebM, MOV, or MKV.')).toBeVisible();
    expect(uploadCalls).toBe(0);
  });

  test('does not create a product when video upload fails', async ({ page }) => {
    await mockSellerSession(page);
    let productCalls = 0;
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { error: 'media_storage_unavailable' }, 503);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') productCalls += 1;
      await fulfillJson(route, { products: [] });
    });
    await page.goto(appUrl('#/seller/upload'));
    await page.locator('#video-file').setInputFiles({
      name: 'sample.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from('fake-mp4-test-payload'),
    });
    await page.getByLabel('Title').fill('Upload failure');
    await page.getByLabel('Price (JPY)').fill('1000');
    await page.getByRole('button', { name: 'Upload and create draft' }).click();
    await expect(page.getByText('media_storage_unavailable')).toBeVisible();
    expect(productCalls).toBe(0);
  });


  test('seller can replace the video while editing an existing draft', async ({ page }) => {
    await mockSellerSession(page);
    const productId = '11111111-1111-4111-8111-111111111111';
    let replacementUploaded = false;
    let productUpdated = false;
    let oldMediaDeleted = false;

    await page.route(`**/api/seller/products/${productId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, {
          product: {
            id: productId,
            title: 'Existing draft',
            description: 'Existing description',
            price_amount: 1200,
            price_currency: 'JPY',
            status: 'draft',
            media_asset_id: 'old-media',
            media_original_filename: 'existing.mp4',
            media_byte_size: 1024,
          },
        });
        return;
      }
      if (route.request().method() === 'PATCH') {
        const body = route.request().postDataJSON();
        expect(body.title).toBe('Updated draft');
        expect(body.description).toBe('Updated description');
        expect(body.priceAmount).toBe(2400);
        expect(body.mediaAssetId).toBe('replacement-media');
        productUpdated = true;
        await fulfillJson(route, { product: { id: productId, status: 'draft' } });
        return;
      }
      await route.fallback();
    });

    await page.route('**/api/seller/media/upload', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['content-type']).toBe('video/mp4');
      expect(route.request().headers()['x-original-filename']).toBe('replacement.mp4');
      replacementUploaded = true;
      await fulfillJson(route, { mediaAsset: { id: 'replacement-media', status: 'ready' } }, 201);
    });

    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, {
          products: [{
            id: productId, title: 'Updated draft', status: 'draft', price_amount: 2400,
            media_asset_id: 'replacement-media', media_status: 'ready',
            media_original_filename: 'replacement.mp4', media_byte_size: 1024,
          }],
          counts: { total: 1, published: 0, review: 0, draft: 1 },
          pagination: { page: 1, per_page: 10, total_count: 1, total_pages: 1 },
        });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/seller/media/assets', async (route) => {
      await fulfillJson(route, {
        mediaAssets: [
          ...(!oldMediaDeleted ? [{ id: 'old-media', original_filename: 'existing.mp4', mime_type: 'video/mp4', byte_size: 1024, status: 'ready', in_use: false, created_at: '2026-10-13T00:00:00.000Z' }] : []),
          { id: 'replacement-media', original_filename: 'replacement.mp4', mime_type: 'video/mp4', byte_size: 1024, status: 'ready', in_use: true, created_at: '2026-10-13T00:01:00.000Z' },
        ],
      });
    });
    await page.route('**/api/seller/media/assets/old-media', async (route) => {
      if (route.request().method() === 'DELETE') {
        oldMediaDeleted = true;
        await route.fulfill({ status: 204 });
        return;
      }
      await route.fallback();
    });

    await page.goto(`/seller/product-edit.html?productId=${productId}`);
    await expect(page.locator('#product-title')).toHaveValue('Existing draft');
    await page.locator('#product-title').fill('Updated draft');
    await page.locator('#product-description').fill('Updated description');
    await page.locator('#product-price').fill('2400');
    await page.locator('#replacement-video').setInputFiles({
      name: 'replacement.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.locator('#save-product').click();

    await expect(page).toHaveURL(/\/seller\/products\.html$/);
    expect(replacementUploaded).toBe(true);
    expect(productUpdated).toBe(true);
    const unusedMediaList = page.locator('#seller-unused-media-list');
    await expect(unusedMediaList.getByText('existing.mp4')).toHaveCount(0);
    await expect(unusedMediaList.getByText('replacement.mp4')).toHaveCount(0);
    expect(oldMediaDeleted).toBe(true);
  });


  test('cleans up a replacement upload that is not ready without patching the draft', async ({ page }) => {
    await mockSellerSession(page);
    const productId = '13131313-1313-4313-8313-131313131313';
    let patchCalls = 0;
    let cleanupCalled = false;
    let alertMessage = '';

    await page.route(`**/api/seller/products/${productId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { product: {
          id: productId, title: 'Existing draft', description: 'Existing description',
          price_amount: 1200, price_currency: 'JPY', status: 'draft',
          media_asset_id: 'old-media', media_original_filename: 'existing.mp4', media_byte_size: 1024,
        } });
        return;
      }
      if (route.request().method() === 'PATCH') {
        patchCalls += 1;
        await fulfillJson(route, { product: { id: productId, status: 'draft' } });
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'replacement-not-ready', status: 'processing' } }, 201);
    });
    await page.route('**/api/seller/media/assets/replacement-not-ready', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      cleanupCalled = true;
      await route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto(`/seller/product-edit.html?productId=${productId}`);
    await page.locator('#replacement-video').setInputFiles({
      name: 'replacement-processing.mp4', mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.locator('#save-product').click();

    expect(patchCalls).toBe(0);
    await expect.poll(() => cleanupCalled).toBe(true);
    await expect.poll(() => alertMessage).toContain('利用可能な状態ではありません');
    await expect(page).toHaveURL(new RegExp(`/seller/product-edit\\.html\\?productId=${productId}`));
  });

  test('avoids repeating a video replacement when the save response is ambiguous', async ({ page }) => {
    await mockSellerSession(page);
    const productId = '12121212-1212-4212-8212-121212121212';
    let alertMessage = '';
    await page.route(`**/api/seller/products/${productId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { product: {
          id: productId, title: 'Existing draft', description: 'Existing description',
          price_amount: 1200, price_currency: 'JPY', status: 'draft',
          media_asset_id: 'old-media', media_original_filename: 'existing.mp4', media_byte_size: 1024,
        } });
        return;
      }
      if (route.request().method() === 'PATCH') {
        await fulfillJson(route, { error: 'upstream_response_lost' }, 502);
        return;
      }
      await route.fallback();
    });
    await page.route('**/api/seller/media/upload', async (route) => {
      await fulfillJson(route, { mediaAsset: { id: 'replacement-ambiguous', status: 'ready' } }, 201);
    });
    await page.route('**/api/seller/media/assets/replacement-ambiguous', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await fulfillJson(route, { error: 'media_asset_in_use' }, 409);
    });
    page.on('dialog', async (dialog) => {
      alertMessage = dialog.message();
      await dialog.accept();
    });

    await page.goto(`/seller/product-edit.html?productId=${productId}`);
    await page.locator('#replacement-video').setInputFiles({
      name: 'replacement.mp4', mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.locator('#save-product').click();

    await expect(page).toHaveURL(/\/seller\/products\.html$/);
    expect(alertMessage).toContain('差し替えが完了している可能性');
  });

  test('product editor keeps publication and review actions in the video list', async ({ page }) => {
    await mockSellerSession(page);
    const productId = '22222222-2222-4222-8222-222222222222';
    await page.route(`**/api/seller/products/${productId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { product: {
          id: productId,
          title: 'Draft product',
          description: 'Draft description',
          price_amount: 1500,
          price_currency: 'JPY',
          status: 'draft',
          media_asset_id: 'ready-media',
          media_status: 'ready',
          media_mime_type: 'video/mp4',
          media_byte_size: 1024,
          media_original_filename: 'ready.mp4',
        } });
        return;
      }
      await route.fallback();
    });

    await page.goto(`/seller/product-edit.html?productId=${productId}`);
    await expect(page.locator('#product-status')).toHaveText('下書き');
    await expect(page.locator('#product-title')).toHaveValue('Draft product');
    await expect(page.locator('#product-description')).toHaveValue('Draft description');
    await expect(page.locator('#current-video-filename')).toHaveText('ready.mp4');
    await expect(page.locator('.buyer-menu-card').filter({ has: page.locator('span', { hasText: 'REVIEW' }) })).toHaveCount(0);
    await expect(page.getByText('公開状態', { exact: true })).toHaveCount(0);
    await expect(page.locator('#save-product')).toContainText('変更を保存する');
  });

  test('seller can delete a draft from the production-linked video list', async ({ page }) => {
    await mockSellerSession(page);
    const draftId = '33333333-3333-4333-8333-333333333333';
    let deleted = false;
    const products = () => deleted ? [{
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Published video',
      price_amount: 1500,
      status: 'published',
      created_at: '2026-10-13T00:00:00.000Z',
    }] : [{
      id: draftId,
      title: 'Draft to delete',
      price_amount: 1200,
      status: 'draft',
      created_at: '2026-10-13T00:00:00.000Z',
    }, {
      id: '44444444-4444-4444-8444-444444444444',
      title: 'Published video',
      price_amount: 1500,
      status: 'published',
      created_at: '2026-10-13T00:00:00.000Z',
    }];
    await page.route('**/api/seller/products?*', async (route) => {
      await fulfillJson(route, {
        products: products(),
        counts: { total: products().length, published: 1, review: 0, draft: deleted ? 0 : 1 },
        pagination: { page: 1, per_page: 10, total_count: products().length, total_pages: 1 },
      });
    });
    await page.route(`**/api/seller/products/${draftId}`, async (route) => {
      expect(route.request().method()).toBe('DELETE');
      deleted = true;
      await route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/seller/products.html');
    await expect(page.getByText('Draft to delete')).toBeVisible();
    await expect(page.getByRole('button', { name: '下書きを削除' })).toBeVisible();
    await expect(page.locator('.seller-video-row').filter({ hasText: 'Published video' }).getByRole('button', { name: '下書きを削除' })).toHaveCount(0);
    await page.getByRole('button', { name: '下書きを削除' }).click();
    await expect(page.getByText('Draft to delete')).toHaveCount(0);
    await expect(page.getByText('Published video')).toBeVisible();
    expect(deleted).toBe(true);
  });

  test('published product cannot be edited until it is unpublished', async ({ page }) => {
    await mockSellerSession(page);
    const productId = '55555555-5555-4555-8555-555555555555';
    let patchCalls = 0;
    let uploadCalls = 0;
    await page.route(`**/api/seller/products/${productId}`, async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { product: {
          id: productId,
          title: 'Published product',
          description: 'Must unpublish before editing',
          price_amount: 1600,
          price_currency: 'JPY',
          status: 'published',
          media_asset_id: 'published-media',
          media_status: 'ready',
          media_mime_type: 'video/mp4',
          media_byte_size: 1024,
          media_original_filename: 'published.mp4',
        } });
        return;
      }
      if (route.request().method() === 'PATCH') patchCalls += 1;
      await route.fallback();
    });
    await page.route('**/api/seller/media/upload', async (route) => {
      uploadCalls += 1;
      await fulfillJson(route, { mediaAsset: { id: 'unexpected-replacement', status: 'ready' } }, 201);
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(`/seller/product-edit.html?productId=${productId}`);
    await expect(page.locator('#product-status')).toHaveText('公開中');
    await page.locator('#product-title').fill('Should not save');
    await page.locator('#replacement-video').setInputFiles({
      name: 'blocked-replacement.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.locator('#save-product').click();
    expect(patchCalls).toBe(0);
    expect(uploadCalls).toBe(0);
  });

  test('seller can delete unused media without exposing media linked to a product', async ({ page }) => {
    await mockSellerSession(page);
    const unusedId = '66666666-6666-4666-8666-666666666666';
    const linkedId = '77777777-7777-4777-8777-777777777777';
    let deleted = false;
    await page.route('**/api/seller/products?*', async (route) => {
      await fulfillJson(route, { products: [], counts: { total: 0, published: 0, review: 0, draft: 0 }, pagination: { page: 1, per_page: 10, total_count: 0, total_pages: 1 } });
    });
    await page.route('**/api/seller/media/assets', async (route) => {
      await fulfillJson(route, { mediaAssets: [
        ...(!deleted ? [{ id: unusedId, original_filename: 'unused.mp4', mime_type: 'video/mp4', byte_size: 1048576, status: 'ready', in_use: false, created_at: '2026-10-13T00:00:00.000Z' }] : []),
        { id: linkedId, original_filename: 'linked.mp4', mime_type: 'video/mp4', byte_size: 2097152, status: 'ready', in_use: true, created_at: '2026-10-13T00:00:00.000Z' },
      ] });
    });
    await page.route(`**/api/seller/media/assets/${unusedId}`, async (route) => {
      expect(route.request().method()).toBe('DELETE');
      deleted = true;
      await route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/seller/products.html');
    const mediaList = page.locator('#seller-unused-media-list');
    await expect(mediaList.getByText('unused.mp4')).toBeVisible();
    await expect(mediaList.getByText('linked.mp4')).toHaveCount(0);
    await mediaList.getByRole('button', { name: '動画ファイルを削除' }).click();
    await expect(mediaList.getByText('unused.mp4')).toHaveCount(0);
    await expect(mediaList.getByText('削除できる未使用の動画ファイルはありません。')).toBeVisible();
    expect(deleted).toBe(true);
  });




  test('saved product details and uploaded media appear in the edit page without implying publication', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/products/product-saved', async (route) => {
      expect(route.request().method()).toBe('GET');
      await fulfillJson(route, {
        product: {
          id: 'product-saved',
          title: '保存済み作品タイトル',
          description: '保存済みの作品説明です。',
          price_amount: 2400,
          price_currency: 'JPY',
          category_slug: 'learning',
          status: 'draft',
          media_asset_id: 'media-saved',
          media_original_filename: 'saved-video.mp4',
          media_byte_size: 7340032,
          translations: [
            { locale: 'ja', title: '保存済み日本語タイトル', description: '保存済み日本語説明' },
            { locale: 'en', title: 'Saved English Title', description: 'Saved English description' }
          ],
          images: [
            { media_asset_id: 'thumbnail-1', image_role: 'thumbnail', sort_order: 0, original_filename: 'saved-thumbnail.webp', mime_type: 'image/webp', byte_size: 1024 },
            { media_asset_id: 'gallery-1', image_role: 'gallery', sort_order: 0, original_filename: 'saved-intro.webp', mime_type: 'image/webp', byte_size: 2048 }
          ]
        }
      });
    });

    await page.goto('/seller/product-edit.html?productId=product-saved');

    await expect(page.locator('#product-title')).toHaveValue('保存済み作品タイトル');
    await expect(page.locator('#product-description')).toHaveValue('保存済みの作品説明です。');
    await expect(page.locator('#product-price')).toHaveValue('2400');
    await expect(page.locator('#product-category')).toHaveValue('learning');
    await expect(page.locator('[data-product-locale="ja"] [data-translation-title]')).toHaveValue('保存済み日本語タイトル');
    await expect(page.locator('[data-product-locale="en"] [data-translation-description]')).toHaveValue('Saved English description');
    await expect(page.locator('#current-video-filename')).toHaveText('saved-video.mp4');
    await expect(page.locator('#current-video-size')).toHaveText('登録済み · 7.0 MB');
    await expect(page.locator('[data-product-image="thumbnail"] [data-current-image]')).toHaveText('saved-thumbnail.webp');
    await expect(page.locator('[data-product-image="gallery"][data-image-order="0"] [data-current-image]')).toHaveText('saved-intro.webp');
    await expect(page.locator('#product-status')).toHaveText('下書き');
    await expect(page.locator('#product-status')).not.toHaveText('公開中');
  });

});
