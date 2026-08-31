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

test.describe('seller upload browser acceptance', () => {
  test('seller can upload a video and create a product draft', async ({ page }) => {
    await mockSellerSession(page);

    let uploaded = false;
    let draftCreated = false;

    await page.route('**/api/seller/media/upload', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().headers()['content-type']).toBe('video/mp4');
      expect(route.request().headers()['x-original-filename']).toBe('sample.mp4');
      expect((await route.request().body()).length).toBeGreaterThan(0);
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
});
