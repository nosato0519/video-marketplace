import { test, expect } from '@playwright/test';

const appUrl = 'http://127.0.0.1:4173/app/index.html';
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

test.describe('real backend buyer browser acceptance', () => {
  test('logged-out buyer resources redirect to login', async ({ page }) => {
    await page.goto(`${appUrl}#/library`);
    await expect(page).toHaveURL(/#\/login\?return=\/library$/);
  });

  test('buyer can browse a real published product and open its real product detail', async ({ page }) => {
    const health = await page.request.get(`${backendUrl}/api/health`);
    expect(health.ok()).toBeTruthy();

    await page.goto(`${appUrl}#/browse`);
    const productLink = page.locator('a[href^="#/product/"]').first();
    await expect(productLink).toBeVisible();

    const href = await productLink.getAttribute('href');
    expect(href).toMatch(/^#\/product\/.+/);
    await productLink.click();

    await expect(page).toHaveURL(/#\/product\/.+$/);
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Purchase' })).toBeVisible();
  });

  test('buyer library exposes protected watch and download actions', async ({ page }) => {
    await page.goto(`${appUrl}#/library`);
    await expect(page.getByRole('heading', { name: /library/i })).toBeVisible();

    const watchLink = page.getByRole('link', { name: 'Watch' }).first();
    const downloadLink = page.getByRole('link', { name: 'Download' }).first();
    await expect(watchLink).toBeVisible();
    await expect(downloadLink).toBeVisible();
    await expect(watchLink).toHaveAttribute('href', /^#\/watch\/.+/);
    await expect(downloadLink).toHaveAttribute('href', /^\/api\/media\/.+\/download$/);
  });

  test('buyer watch page uses the protected media stream endpoint', async ({ page }) => {
    const libraryResponse = await page.request.get(`${backendUrl}/api/library`);
    expect(libraryResponse.ok()).toBeTruthy();
    const library = await libraryResponse.json();
    const item = library.items?.find((entry) => entry.streaming_enabled);
    test.skip(!item, 'No stream-enabled entitlement is available in the acceptance fixture.');

    await page.goto(`${appUrl}#/watch/${item.product_id}`);
    await expect(page.getByRole('heading', { name: 'Watch video' })).toBeVisible();
    await expect(page.locator('video.secure-player')).toHaveAttribute('src', `/api/media/${item.product_id}/stream`);
    await expect(page.getByText('Playback is protected by your active entitlement.')).toBeVisible();
  });
});
