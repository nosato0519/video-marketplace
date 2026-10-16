import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

const routes = [
  { hash: '#/', heading: 'Discover videos worth watching.' },
  { hash: '#/browse', heading: 'Discover' },
  { hash: '#/categories', heading: 'Categories' },
  { hash: '#/popular', heading: 'Popular' },
  { hash: '#/creators', heading: 'Discover creators' },
  { hash: '#/login', heading: 'Log in' },
  { hash: '#/register', heading: 'Create your account' },
];

test.describe('public marketplace browser smoke', () => {
  test('loads the application shell and public routes', async ({ page }) => {
    for (const route of routes) {
      await page.goto(appUrl(route.hash));
      await expect(page.locator('#app')).toBeVisible();
      await expect(page.locator('body')).toContainText(route.heading);
    }
  });

  test('primary navigation exposes buyer and creator entry points', async ({ page }) => {
    await page.goto(appUrl('#/'));
    const primaryNav = page.getByLabel('Primary');
    await expect(primaryNav.getByRole('link', { name: /Discover/i })).toHaveAttribute('href', '#/browse');
    await expect(primaryNav.getByRole('link', { name: /Categories/i })).toHaveAttribute('href', '#/categories');
    await expect(primaryNav.getByRole('link', { name: /Popular/i })).toHaveAttribute('href', '#/popular');
    await expect(primaryNav.getByRole('link', { name: /Creators/i })).toHaveAttribute('href', '#/creators');
    await expect(page.getByRole('link', { name: /Become a creator/i })).toHaveAttribute('href', '#/seller/register');
  });

  test('creator discovery links back into the seller entry point', async ({ page }) => {
    await page.goto(appUrl('#/creators'));
    await expect(page.getByRole('heading', { name: 'Discover creators' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Become a creator' })).toHaveAttribute('href', '#/seller/register');
  });

  test('browse cards display the thumbnail returned by the public catalog API', async ({ page }) => {
    await page.route('**/api/catalog/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'product-with-thumbnail',
            title: 'Thumbnail test video',
            seller: 'Test seller',
            category: 'movie',
            price_amount: 1200,
            price_currency: 'JPY',
            thumbnail_url: '/api/catalog/products/product-with-thumbnail/images/thumb-1',
          }],
          pagination: { page: 1, limit: 24, returned: 1, hasMore: false },
        }),
      });
    });
    await page.route('**/api/catalog/products/product-with-thumbnail/images/thumb-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nZ8AAAAASUVORK5CYII=', 'base64'),
      });
    });

    await page.goto(appUrl('#/browse'));
    const thumbnail = page.locator('[data-product-id="product-with-thumbnail"] .product-thumbnail');
    await expect(thumbnail).toHaveAttribute('src', '/api/catalog/products/product-with-thumbnail/images/thumb-1');
    await expect(thumbnail).toBeVisible();
  });

  test('browse cards keep a video placeholder when the catalog has no thumbnail', async ({ page }) => {
    await page.route('**/api/catalog/products**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: [{
            id: 'product-without-thumbnail',
            title: 'Video without thumbnail',
            seller: 'Test seller',
            category: 'movie',
            price_amount: 1200,
            price_currency: 'JPY',
            thumbnail_url: null,
          }],
          pagination: { page: 1, limit: 24, returned: 1, hasMore: false },
        }),
      });
    });

    await page.goto(appUrl('#/browse'));
    await expect(page.locator('[data-product-id="product-without-thumbnail"] .product-thumb')).toContainText('▶');
    await expect(page.locator('[data-product-id="product-without-thumbnail"] .product-thumbnail')).toHaveCount(0);
  });

  test('published thumbnails render in new releases, category, video list, and product detail', async ({ page }) => {
    const thumbnailUrl = '/api/catalog/products/product-thumb/images/thumb-1';
    const product = {
      id: 'product-thumb',
      title: 'Thumbnail test video',
      seller: 'Test seller',
      category: 'movie',
      description: 'A product used to verify thumbnail rendering.',
      price_amount: 1200,
      price_currency: 'JPY',
      thumbnail_url: thumbnailUrl,
    };

    await page.route('**/api/catalog/products**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname === '/api/catalog/products/product-thumb') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              ...product,
              images: [{ id: 'thumb-1', role: 'thumbnail', sortOrder: 0, mimeType: 'image/jpeg', url: thumbnailUrl }],
            },
          }),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [product], pagination: { page: 1, limit: 24, returned: 1, hasMore: false } }),
      });
    });
    await page.route('**/api/catalog/products/product-thumb/images/thumb-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'image/png',
        body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/nZ8AAAAASUVORK5CYII=', 'base64'),
      });
    });

    await page.goto('/');
    await expect(page.locator('[data-published-listings="new-releases"] .published-listing-thumbnail')).toHaveAttribute('src', thumbnailUrl);

    await page.goto('/pages/category.html?category=movie');
    await expect(page.locator('[data-published-listings="category"] .published-listing-thumbnail')).toHaveAttribute('src', thumbnailUrl);

    await page.goto('/pages/video-list.html');
    await expect(page.locator('#catalog-grid .catalog-thumbnail')).toHaveAttribute('src', thumbnailUrl);

    await page.goto('/pages/product-detail.html?productId=product-thumb');
    await expect(page.locator('.detail-media-image')).toHaveCSS('background-image', /product-thumb\/images\/thumb-1/);
  });
});
