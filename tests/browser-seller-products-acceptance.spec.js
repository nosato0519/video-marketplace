import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }) });
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
      await fulfillJson(route, { products: [
        { id: 'product-processing', title: 'Processing Video', description: 'Waiting for validation.', price_amount: 1500, price_currency: 'JPY', status: 'approved', media_asset_id: 'media-processing', media_status: 'processing', media_original_filename: 'processing.mp4', media_byte_size: 1048576 },
        { id: 'product-ready', title: 'Ready Video', description: 'Ready to publish.', price_amount: 2500, price_currency: 'JPY', status: 'approved', media_asset_id: 'media-ready', media_status: 'ready', media_original_filename: 'ready.mp4', media_byte_size: 5242880 },
      ] });
    });
    await page.route('**/api/seller/products/product-ready/publish', async (route) => { expect(route.request().method()).toBe('POST'); publishCalled = true; await fulfillJson(route, { product: { id: 'product-ready', status: 'published' } }); });
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

  test('seller can create a draft product with an uploaded video and required thumbnail', async ({ page }) => {
    await mockSellerSession(page);
    let createBody = null;
    let uploadIndex = 0;
    await page.route('**/api/seller/media/limits', async (route) => {
      await fulfillJson(route, { maxUploadBytes: 5368709120, maxImageUploadBytes: 20971520 });
    });
    await page.route('**/api/seller/media/upload', async (route) => {
      uploadIndex += 1;
      const filename = decodeURIComponent(route.request().headers()['x-original-filename'] || '');
      const isVideo = filename === 'ready.mp4';
      await fulfillJson(route, { mediaAsset: {
        id: isVideo ? 'media-ready' : 'thumbnail-ready',
        original_filename: filename,
        mime_type: isVideo ? 'video/mp4' : 'image/png',
        byte_size: isVideo ? 5242880 : 1024,
        status: 'ready'
      } }, 201);
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { products: [] });
        return;
      }
      expect(route.request().method()).toBe('POST');
      createBody = route.request().postDataJSON();
      await fulfillJson(route, { product: { id: 'product-draft', title: 'Draft Product', status: 'draft', media_asset_id: 'media-ready' } }, 201);
    });
    await page.goto('/seller/product-editor.html');
    await page.getByRole('textbox', { name: '例：THE LAST SIGNAL' }).fill('Draft Product');
    await page.getByRole('textbox', { name: '¥4,800' }).fill('1000');
    await page.getByLabel('動画ファイル').setInputFiles({ name: 'ready.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video') });
    await page.getByLabel('サムネイル画像').setInputFiles({ name: 'thumbnail.png', mimeType: 'image/png', buffer: Buffer.from('image') });
    await page.getByRole('button', { name: '下書きを保存する →' }).click();
    await expect.poll(() => createBody).not.toBeNull();
    expect(createBody.title).toBe('Draft Product');
    expect(createBody.priceAmount).toBe(1000);
    expect(createBody.priceCurrency).toBe('JPY');
    expect(createBody.mediaAssetId).toBe('media-ready');
    expect(createBody.images).toEqual([{ mediaAssetId: 'thumbnail-ready', role: 'thumbnail', sortOrder: 0 }]);
    expect(uploadIndex).toBe(2);
    await expect(page).toHaveURL(/\/seller\/products\.html$/);
  });

  test('seller video management shows real product counts and supports pagination', async ({ page }) => {
    const requestedPages = [];
    await page.route('**/api/seller/products?*', async (route) => {
      const url = new URL(route.request().url());
      const pageNumber = Number(url.searchParams.get('page') || 1);
      requestedPages.push(pageNumber);
      await fulfillJson(route, {
        products: [{ id: `product-page-${pageNumber}`, title: `Video page ${pageNumber}`, price_amount: 2000, status: 'draft', created_at: '2026-10-01T00:00:00.000Z' }],
        counts: { total: 11, published: 4, review: 2, draft: 5 },
        pagination: { page: pageNumber, total_pages: 2, total: 11, per_page: 10 }
      });
    });
    await page.route('**/api/seller/media/assets', async (route) => {
      await fulfillJson(route, { mediaAssets: [] });
    });

    await page.goto('/seller/products.html');
    await expect(page.getByRole('heading', { name: '動画管理' })).toBeVisible();
    await expect(page.locator('#product-count')).toHaveText('11');
    await expect(page.locator('#published-count')).toHaveText('4');
    await expect(page.locator('#review-count')).toHaveText('2');
    await expect(page.locator('#draft-count')).toHaveText('5');
    await expect(page.getByText('Video page 1')).toBeVisible();
    await page.locator('.seller-pagination').getByRole('link', { name: '2', exact: true }).click();
    await expect(page).toHaveURL(/\?page=2$/);
    await expect(page.getByText('Video page 2')).toBeVisible();
    expect(requestedPages).toEqual([1, 2]);
  });

  test('saving details keeps the existing video when upload limits cannot load', async ({ page }) => {
    await mockSellerSession(page);
    const patchBodies = [];
    await page.route('**/api/seller/products', async (route) => {
      await fulfillJson(route, { products: [{ id: 'product-existing', title: 'Existing Product', description: 'Keep attached video.', price_amount: 2000, price_currency: 'JPY', status: 'draft', media_asset_id: 'media-existing' }] });
    });
    await page.route('**/api/seller/products/product-existing', async (route) => {
      if (route.request().method() === 'GET') {
        await fulfillJson(route, { product: { id: 'product-existing', title: 'Existing Product', description: 'Keep attached video.', price_amount: 2000, price_currency: 'JPY', status: 'draft', media_asset_id: 'media-existing', media_status: 'ready' } });
        return;
      }
      expect(route.request().method()).toBe('PATCH');
      patchBodies.push(route.request().postDataJSON());
      await fulfillJson(route, { product: { id: 'product-existing', title: 'Updated Product', status: 'draft' } });
    });
    await page.route('**/api/seller/media/limits', async (route) => {
      await fulfillJson(route, { error: 'media_limits_unavailable' }, 503);
    });
    await page.goto('/seller/product-edit.html?productId=product-existing');
    await expect(page.locator('#product-title')).toHaveValue('Existing Product');
    await page.locator('#product-title').fill('Updated Product');
    await page.locator('#save-product').click();
    await expect.poll(() => patchBodies.length).toBe(1);
    expect(patchBodies[0].title).toBe('Updated Product');
    expect(Object.prototype.hasOwnProperty.call(patchBodies[0], 'mediaAssetId')).toBe(false);
  });


  test('seller cannot create a product without selecting a video', async ({ page }) => {
    await mockSellerSession(page);
    let createCalled = false;
    await page.route('**/api/seller/media/limits', async (route) => {
      await fulfillJson(route, { maxUploadBytes: 5368709120, maxImageUploadBytes: 20971520 });
    });
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'POST') createCalled = true;
      await fulfillJson(route, { products: [] });
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto('/seller/product-editor.html');
    await page.getByPlaceholder('例：THE LAST SIGNAL').fill('Missing video');
    await page.getByPlaceholder('¥4,800').fill('1000');
    await page.getByRole('button', { name: '下書きを保存する →' }).click();
    await expect(page.getByRole('button', { name: '下書きを保存する →' })).toBeVisible();
    expect(createCalled).toBe(false);
  });

  test('seller can unpublish a product and delete an unpurchased draft', async ({ page }) => {
    await mockSellerSession(page);
    const actions = [];
    let products = [
      { id: 'product-published', title: 'Published Video', description: '', price_amount: 1500, price_currency: 'JPY', status: 'published', media_asset_id: 'media-ready', media_status: 'ready', media_original_filename: 'ready.mp4', media_byte_size: 5242880 },
      { id: 'product-draft', title: 'Draft Video', description: '', price_amount: 1000, price_currency: 'JPY', status: 'draft', media_asset_id: 'media-ready', media_status: 'ready', media_original_filename: 'ready.mp4', media_byte_size: 5242880 },
    ];
    await page.route('**/api/seller/products', async (route) => {
      if (route.request().method() === 'GET') { await fulfillJson(route, { products }); return; }
      await route.fallback();
    });
    await page.route('**/api/seller/products/product-published/unpublish', async (route) => {
      expect(route.request().method()).toBe('POST');
      actions.push('unpublish');
      products = products.map((product) => product.id === 'product-published' ? { ...product, status: 'draft' } : product);
      await fulfillJson(route, { product: { id: 'product-published', status: 'draft' } });
    });
    await page.route('**/api/seller/products/product-draft', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      actions.push('delete-draft');
      products = products.filter((product) => product.id !== 'product-draft');
      await route.fulfill({ status: 204, body: '' });
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(appUrl('#/seller/products'));
    const publishedCard = page.locator('[data-product-id="product-published"]');
    await publishedCard.getByRole('button', { name: 'Unpublish' }).click();
    await expect.poll(() => actions).toContain('unpublish');
    await expect(publishedCard.getByText('Draft', { exact: true })).toBeVisible();
    const draftCard = page.locator('[data-product-id="product-draft"]');
    await draftCard.getByRole('button', { name: 'Delete draft' }).click();
    await expect.poll(() => actions).toContain('delete-draft');
    await expect(page.locator('[data-product-id="product-draft"]')).toHaveCount(0);
  });

  test('seller is told when a draft with purchase history cannot be deleted', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/products', async (route) => {
      await fulfillJson(route, { products: [{ id: 'product-history', title: 'Purchased Video', description: '', price_amount: 1500, price_currency: 'JPY', status: 'draft', media_asset_id: 'media-ready', media_status: 'ready', media_original_filename: 'ready.mp4', media_byte_size: 5242880 }] });
    });
    await page.route('**/api/seller/products/product-history', async (route) => {
      expect(route.request().method()).toBe('DELETE');
      await fulfillJson(route, { error: 'product_has_purchase_history' }, 409);
    });
    page.on('dialog', (dialog) => dialog.accept());
    await page.goto(appUrl('#/seller/products'));
    const card = page.locator('[data-product-id="product-history"]');
    await card.getByRole('button', { name: 'Delete draft' }).click();
    await expect(page.getByText('product_has_purchase_history')).toBeVisible();
    await expect(card).toBeVisible();
  });

  test('published products cannot be edited until they are unpublished', async ({ page }) => {
    await mockSellerSession(page);
    let editFetches = 0;
    await page.route('**/api/seller/products', async (route) => {
      await fulfillJson(route, { products: [{ id: 'product-published', title: 'Published Video', description: '', price_amount: 1500, price_currency: 'JPY', status: 'published', media_asset_id: 'media-ready', media_status: 'ready', media_original_filename: 'ready.mp4', media_byte_size: 5242880 }] });
    });
    await page.route('**/api/seller/products/product-published', async (route) => {
      editFetches += 1;
      await fulfillJson(route, { product: { id: 'product-published', status: 'published' } });
    });
    await page.goto(appUrl('#/seller/products'));
    const card = page.locator('[data-product-id="product-published"]');
    await expect(card.getByRole('button', { name: 'Edit details' })).toBeDisabled();
    expect(editFetches).toBe(0);
  });

});
