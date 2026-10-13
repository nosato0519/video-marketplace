import { test, expect } from '@playwright/test';

test('seller upload waits for the configured upload limit before enabling submission', async ({ page }) => {
  let releaseLimits;
  const limitsPending = new Promise((resolve) => {
    releaseLimits = resolve;
  });

  await page.route('**/api/seller/media/limits', async (route) => {
    await limitsPending;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maxUploadBytes: 24 * 1024 * 1024 }),
    });
  });

  await page.goto('/app/index.html');
  await page.evaluate(async () => {
    const { renderSellerUpload } = await import('/seller/seller-upload.js');
    await renderSellerUpload(document.querySelector('#app'));
  });

  const submit = page.getByRole('button', { name: 'Upload and create draft' });
  await expect(submit).toBeDisabled();

  releaseLimits();
  await expect(submit).toBeEnabled();
  await expect(page.getByText('MP4, WebM, MOV or MKV · up to 24 MB')).toBeVisible();
});

test('seller upload rejects a file larger than the backend-provided limit before sending it', async ({ page }) => {
  let uploadRequested = false;

  await page.route('**/api/seller/media/limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maxUploadBytes: 2 * 1024 * 1024 }),
    });
  });
  await page.route('**/api/seller/media/upload', async (route) => {
    uploadRequested = true;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ mediaAsset: { id: 'asset-1', status: 'ready' } }) });
  });

  await page.goto('/app/index.html');
  await page.evaluate(async () => {
    const { renderSellerUpload } = await import('/seller/seller-upload.js');
    await renderSellerUpload(document.querySelector('#app'));
  });

  await expect(page.getByRole('button', { name: 'Upload and create draft' })).toBeEnabled();
  await page.locator('#video-file').setInputFiles({
    name: 'oversized.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.alloc(2 * 1024 * 1024 + 1),
  });
  await page.getByLabel('Title').fill('Oversized test video');
  await page.getByRole('button', { name: 'Upload and create draft' }).click();

  await expect(page.locator('#seller-upload-message')).toContainText('exceeds the 2 MB upload limit');
  expect(uploadRequested).toBe(false);
});

test('seller upload stays disabled when the backend upload limit cannot be loaded', async ({ page }) => {
  await page.route('**/api/seller/media/limits', async (route) => {
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'temporarily_unavailable' }) });
  });

  await page.goto('/app/index.html');
  await page.evaluate(async () => {
    const { renderSellerUpload } = await import('/seller/seller-upload.js');
    await renderSellerUpload(document.querySelector('#app'));
  });

  await expect(page.getByRole('button', { name: 'Upload and create draft' })).toBeDisabled();
  await expect(page.locator('#seller-upload-message')).toContainText('Unable to load the upload limit');
});


test('seller upload stays disabled when the backend returns an invalid upload limit', async ({ page }) => {
  await page.route('**/api/seller/media/limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maxUploadBytes: '5 GB' }),
    });
  });

  await page.goto('/app/index.html');
  await page.evaluate(async () => {
    const { renderSellerUpload } = await import('/seller/seller-upload.js');
    await renderSellerUpload(document.querySelector('#app'));
  });

  await expect(page.getByRole('button', { name: 'Upload and create draft' })).toBeDisabled();
  await expect(page.locator('#seller-upload-message')).toContainText('Unable to load the upload limit');
});


test('seller upload cannot be submitted without a valid backend limit even via form submission', async ({ page }) => {
  let uploadRequested = false;
  await page.route('**/api/seller/media/limits', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ maxUploadBytes: 'invalid' }),
    });
  });
  await page.route('**/api/seller/media/upload', async (route) => {
    uploadRequested = true;
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ mediaAsset: { id: 'asset-1', status: 'ready' } }) });
  });

  await page.goto('/app/index.html');
  await page.evaluate(async () => {
    const { renderSellerUpload } = await import('/seller/seller-upload.js');
    await renderSellerUpload(document.querySelector('#app'));
  });

  await page.locator('#video-file').setInputFiles({
    name: 'small.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70]),
  });
  await page.getByLabel('Title').fill('Test video');
  await page.locator('#seller-upload-form').evaluate((form) => form.requestSubmit());

  await expect(page.locator('#seller-upload-message')).toContainText('Unable to load the upload limit');
  expect(uploadRequested).toBe(false);
  await expect(page.getByRole('button', { name: 'Upload and create draft' })).toBeDisabled();
});
