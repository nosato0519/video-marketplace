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
}

async function fulfillJson(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('seller products browser acceptance', () => {
  test('seller sees media readiness and cannot publish until video is ready', async ({ page }) => {
    await mockSellerSession(page);
    let publishCalled = false;

    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('GET');
      await fulfillJson(route, {
        products: [
          {
            id: 'product-processing',
            title: 'Processing Video',
            description: 'Waiting for validation.',
            price_amount: 1500,
            price_currency: 'JPY',
            status: 'draft',
            media_asset_id: 'media-processing',
            media_status: 'processing',
            media_original_filename: 'processing.mp4',
            media_byte_size: 1048576,
          },
          {
            id: 'product-ready',
            title: 'Ready Video',
            description: 'Ready to publish.',
            price_amount: 2500,
            price_currency: 'JPY',
            status: 'draft',
            media_asset_id: 'media-ready',
            media_status: 'ready',
            media_original_filename: 'ready.mp4',
            media_byte_size: 5242880,
          },
        ],
      });
    });

    await page.route('**/api/seller/products/product-ready/publish', async (route) => {
      expect(route.request().method()).toBe('POST');
      publishCalled = true;
      await fulfillJson(route, { product: { id: 'product-ready', status: 'published' } });
    });

    await page.goto(appUrl('#/seller/products'));

    await expect(page.getByRole('heading', { name: 'My videos' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Processing Video' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ready Video' })).toBeVisible();
    await expect(page.getByText('Video processing')).toBeVisible();
    await expect(page.getByText('Video ready')).toBeVisible();
    await expect(page.getByText('ready.mp4 · 5.0 MB')).toBeVisible();

    const processingCard = page.locator('[data-product-id="product-processing"]');
    await expect(processingCard.getByRole('button', { name: 'Publish' })).toBeDisabled();

    const readyCard = page.locator('[data-product-id="product-ready"]');
    await expect(readyCard.getByRole('button', { name: 'Publish' })).toBeEnabled();
    await readyCard.getByRole('button', { name: 'Publish' }).click();
    await expect.poll(() => publishCalled).toBe(true);
  });

  test('seller can create a product from the products page without a video and gets a clear next step', async ({ page }) => {
    await mockSellerSession(page);

    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { products: [] });
        return;
      }
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body.title).toBe('Draft Product');
      expect(body.priceAmount).toBe(1000);
      expect(body.priceCurrency).toBe('JPY');
      expect(body).not.toHaveProperty('mediaAssetId');
      await fulfillJson(route, { product: { id: 'product-draft', title: 'Draft Product', status: 'draft' } });
    });

    await page.goto(appUrl('#/seller/products'));
    await page.getByRole('button', { name: 'Create product' }).click();
    await page.getByLabel('Title').fill('Draft Product');
    await page.getByLabel('Price').fill('1000');
    await page.getByRole('button', { name: 'Create product', exact: true }).last().click();

    await expect(page.getByText('1 product')).toBeVisible();
  });
});
