import { test, expect } from '@playwright/test';

test('buyer library exposes protected watch and download actions', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'buyer-e2e', email: 'buyer@example.com' } }),
    });
  });

  await page.route('**/api/library', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        items: [{
          product_id: 'demo-1',
          title: 'Featured Video',
          description: 'Purchased demo video.',
          media_asset_id: 'media-demo-1',
          media_status: 'ready',
          purchased_at: '2026-09-04T00:00:00.000Z',
          streaming_enabled: true,
          download_enabled: true,
        }],
      }),
    });
  });

  await page.goto('/app/index.html#/library');

  await expect(page.getByRole('heading', { name: /buyer@example\.com.*library/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();

  const watchLink = page.getByRole('link', { name: 'Watch' });
  await expect(watchLink).toHaveAttribute('href', '#/watch/demo-1');

  const downloadLink = page.getByRole('link', { name: 'Download' });
  await expect(downloadLink).toHaveAttribute('href', '/api/media/demo-1/download');

  await watchLink.click();
  await expect(page).toHaveURL(/#\/watch\/demo-1$/);
  await expect(page.locator('video.secure-player')).toHaveAttribute('src', '/api/media/demo-1/stream');
  await expect(page.getByText('Playback is protected by your active purchase entitlement.')).toBeVisible();
});