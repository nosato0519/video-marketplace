import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }) });
  });
  await page.route('**/api/seller/media/limits', async (route) => {
    await fulfillJson(route, { maxUploadBytes: 5 * 1024 * 1024 * 1024, maxImageUploadBytes: 20 * 1024 * 1024 });
  });
}

async function fulfillJson(route, body) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('seller browser acceptance', () => {
  test('logged-out seller profile redirects to login', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_required' }) });
    });
    await page.goto(appUrl('#/seller/profile'));
    await expect(page).toHaveURL(/#\/login\?return=\/seller\/profile$/);
  });

  test('buyer account cannot open seller tools but can apply for seller access', async ({ page }) => {
    let sellerApiCalls = 0;
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ user: { id: 'buyer-1', email: 'buyer@example.test', role: 'buyer' } }),
      });
    });
    await page.route('**/api/seller/**', async (route) => {
      sellerApiCalls += 1;
      await route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'forbidden' }) });
    });

    await page.goto(appUrl('#/seller/upload'));
    await expect(page.getByRole('heading', { name: 'Seller account required' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apply to become a seller' })).toHaveAttribute('href', '#/seller/register');
    expect(sellerApiCalls).toBe(0);

    await page.goto(appUrl('#/seller/register'));
    await expect(page.getByRole('heading', { name: 'Seller application' })).toBeVisible();
  });

  test('seller can save profile and submit verification', async ({ page }) => {
    await mockSellerSession(page);
    let profileSaved = false;
    let verificationSubmitted = false;
    let profileReads = 0;

    await page.route('**/api/seller/profile', async (route) => {
      if (route.request().method() === 'GET') {
        profileReads += 1;
        await fulfillJson(route, { profile: { displayName: profileReads > 1 ? 'Seller Updated' : 'Seller One', legalName: 'Seller One LLC', countryCode: 'JP', verificationStatus: 'not_started' } });
        return;
      }
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().postDataJSON().displayName).toBe('Seller Updated');
      profileSaved = true;
      await fulfillJson(route, { profile: { displayName: 'Seller Updated', legalName: 'Seller One LLC', countryCode: 'JP', verificationStatus: 'not_started' } });
    });

    await page.route('**/api/seller/profile/submit-verification', async (route) => {
      expect(route.request().method()).toBe('POST');
      verificationSubmitted = true;
      await fulfillJson(route, { profile: { verificationStatus: 'submitted' } });
    });

    await page.goto(appUrl('#/seller/profile'));
    await expect(page.getByRole('heading', { name: 'Profile & verification' })).toBeVisible();
    await page.getByLabel('Display name').fill('Seller Updated');
    await page.getByRole('button', { name: 'Save profile' }).click();
    await expect(page.locator('input[name="displayName"]')).toHaveValue('Seller Updated');
    expect(profileSaved).toBe(true);
    await page.getByRole('button', { name: 'Submit for verification' }).click();
    expect(verificationSubmitted).toBe(true);
  });

  test('seller dashboard exposes the video business management areas', async ({ page }) => {
    await mockSellerSession(page);
    await page.goto(appUrl('#/seller'));
    await expect(page.getByRole('heading', { name: 'Seller dashboard' })).toBeVisible();
    await expect(page.locator('a[href="#/seller/upload"]')).toHaveCount(2);
    await expect(page.locator('a[href="#/seller/products"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/seller/sales"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/seller/payouts"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/seller/profile"]')).toHaveCount(1);
  });

  test('prevents duplicate video uploads when the seller submits twice', async ({ page }) => {
    await mockSellerSession(page);
    let releaseUpload;
    const uploadGate = new Promise((resolve) => { releaseUpload = resolve; });
    let uploadCalls = 0;
    let draftCalls = 0;

    let thumbnailCalls = 0;
    await page.addInitScript(() => {
      const createElement = document.createElement.bind(document);
      document.createElement = function (name, ...args) {
        const element = createElement(name, ...args);
        if (name.toLowerCase() === 'video') {
          Object.defineProperties(element, {
            videoWidth: { configurable: true, value: 640 },
            videoHeight: { configurable: true, value: 360 },
            duration: { configurable: true, value: 2 },
            currentTime: {
              configurable: true,
              set() { queueMicrotask(() => element.dispatchEvent(new Event('seeked'))); },
            },
          });
          const addEventListener = element.addEventListener.bind(element);
          element.addEventListener = function (type, listener, options) {
            if (type === 'loadedmetadata') {
              queueMicrotask(() => listener(new Event(type)));
              return;
            }
            addEventListener(type, listener, options);
          };
        }
        if (name.toLowerCase() === 'canvas') {
          element.getContext = () => ({ drawImage() {} });
          element.toBlob = (callback, type) => callback(new Blob(['thumbnail'], { type }));
        }
        return element;
      };
    });
    await page.route('**/api/seller/media/upload', async (route) => {
      const contentType = route.request().headers()['content-type'];
      if (contentType === 'video/mp4') uploadCalls += 1;
      if (contentType === 'image/jpeg') thumbnailCalls += 1;
      await uploadGate;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          mediaAsset: {
            id: contentType === 'image/jpeg' ? 'media-spa-thumbnail' : 'media-spa-duplicate',
            status: 'ready'
          }
        }),
      });
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        expect(body.images).toEqual([{ mediaAssetId: 'media-spa-thumbnail', role: 'thumbnail', sortOrder: 0 }]);
        draftCalls += 1;
        await fulfillJson(route, { product: { id: 'draft-spa-duplicate', title: 'SPA Upload', status: 'draft' } });
      } else {
        await route.fallback();
      }
    });

    await page.goto(appUrl('#/seller/upload'));
    await page.getByLabel('Title').fill('SPA Upload');
    await page.getByLabel('Price (JPY)').fill('1500');
    await page.getByLabel('Video file').setInputFiles({
      name: 'spa-upload.mp4',
      mimeType: 'video/mp4',
      buffer: Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
    });
    await page.getByLabel('Thumbnail image').setInputFiles({
      name: 'spa-thumbnail.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([255, 216, 255, 217]),
    });

    try {
      await page.getByRole('button', { name: 'Upload and create draft' }).click();
      await expect.poll(() => uploadCalls).toBe(1);
      await page.locator('#seller-upload-form').evaluate((form) => form.requestSubmit());
      await expect.poll(() => uploadCalls).toBe(1);
      expect(draftCalls).toBe(0);
      expect(thumbnailCalls).toBe(0);
    } finally {
      releaseUpload();
    }
    await expect(page.getByText(/Draft SPA Upload created successfully\./)).toBeVisible();
    expect(uploadCalls).toBe(1);
    expect(thumbnailCalls).toBe(1);
    expect(draftCalls).toBe(1);
  });

  test('seller earnings page exposes earnings summary', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/earnings', async (route) => {
      await fulfillJson(route, { summary: { earned_amount: 96, available_amount: 46, paid_amount: 50, sale_count: 2 }, earnings: [{ order_id: 'order-1', gross_amount: 120, platform_fee: 24, net_amount: 96, currency: 'JPY', status: 'paid', created_at: '2026-08-31T00:00:00Z' }] });
    });

    await page.goto(appUrl('#/seller/sales'));
    await expect(page.getByRole('heading', { name: 'Sales & earnings' })).toBeVisible();
    await expect(page.locator('#earned')).toContainText('96');
    await expect(page.getByText('paid', { exact: true })).toBeVisible();
    await expect(page.getByText('order-1')).toBeVisible();
  });
});
