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
