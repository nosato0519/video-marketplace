import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }) });
  });
}

async function json(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('seller business browser acceptance', () => {
  test('seller can submit a payout request from the browser', async ({ page }) => {
    await mockSellerSession(page);
    let payoutPosted = false;
    await page.route('**/api/seller/payouts', async (route) => {
      if (route.request().method() === 'GET') {
        await json(route, { payouts: [] });
        return;
      }
      payoutPosted = true;
      const body = route.request().postDataJSON();
      expect(body.amount).toBe(5000);
      expect(body.currency).toBe('JPY');
      await json(route, { payout: { id: 'payout-1', amount: 5000, currency: 'JPY', status: 'requested' } });
    });

    await page.goto(appUrl('#/seller/payouts'));
    await page.getByLabel('Amount').fill('5000');
    await page.getByLabel('Currency').selectOption('JPY');
    await page.getByRole('button', { name: 'Request payout' }).click();
    await expect(page.getByText('Payout request submitted.')).toBeVisible();
    expect(payoutPosted).toBe(true);
  });

  test('seller upload creates a product draft with the uploaded media asset', async ({ page }) => {
    await mockSellerSession(page);
    let uploaded = false;
    let created = false;
    await page.route('**/api/seller/media/upload', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['x-original-filename']).toBe('demo.webm');
      uploaded = true;
      await json(route, { mediaAsset: { id: 'media-1' } });
    });
    await page.route('**/api/seller/products', async (route) => {
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body.title).toBe('Demo Seller Video');
      expect(body.priceAmount).toBe(1500);
      expect(body.mediaAssetId).toBe('media-1');
      created = true;
      await json(route, { product: { id: 'product-1', title: 'Demo Seller Video', status: 'draft' } });
    });

    await page.goto(appUrl('#/seller/upload'));
    await page.getByLabel('Title').fill('Demo Seller Video');
    await page.getByLabel('Description').fill('Browser acceptance video');
    await page.getByLabel('Price (JPY)').fill('1500');
    await page.locator('#video-file').setInputFiles({ name: 'demo.webm', mimeType: 'video/webm', buffer: Buffer.from('demo-video') });
    await page.getByRole('button', { name: 'Upload and create draft' }).click();

    await expect(page.getByText(/Draft .* created successfully/)).toBeVisible();
    expect(uploaded).toBe(true);
    expect(created).toBe(true);
  });

  test('seller can publish and unpublish a product', async ({ page }) => {
    await mockSellerSession(page);
    let status = 'draft';
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'GET') {
        await json(route, { products: [{ id: 'product-1', title: 'Demo Seller Video', description: 'Demo', price_amount: 1500, price_currency: 'JPY', status }] });
        return;
      }
      await json(route, { product: { id: 'product-1', title: 'Demo Seller Video', status: 'draft' } });
    });
    await page.route('**/api/seller/products/product-1/publish', async (route) => {
      expect(route.request().method()).toBe('POST');
      status = 'published';
      await json(route, { product: { id: 'product-1', title: 'Demo Seller Video', status } });
    });
    await page.route('**/api/seller/products/product-1/unpublish', async (route) => {
      expect(route.request().method()).toBe('POST');
      status = 'draft';
      await json(route, { product: { id: 'product-1', title: 'Demo Seller Video', status } });
    });

    await page.goto(appUrl('#/seller/products'));
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
    await page.getByRole('button', { name: 'Publish' }).click();
    await expect(page.getByRole('button', { name: 'Unpublish' })).toBeVisible();
    await page.getByRole('button', { name: 'Unpublish' }).click();
    await expect(page.getByRole('button', { name: 'Publish' })).toBeVisible();
  });
});
