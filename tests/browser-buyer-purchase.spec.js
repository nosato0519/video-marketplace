import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockBuyerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'buyer-1', email: 'buyer@example.test', role: 'buyer' } }),
    });
  });
}

test.describe('buyer purchase browser acceptance', () => {
  test('logged-out buyer resources redirect to login', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'authentication_required' }),
      });
    });

    await page.goto(appUrl('#/library'));
    await expect(page).toHaveURL(/#\/login\?return=%2Flibrary$/);
  });

  test('buyer can open a product and start secure checkout', async ({ page }) => {
    await mockBuyerSession(page);

    let purchaseIntentSeen = false;
    let orderCreated = false;
    let checkoutStarted = false;

    await page.route('**/api/catalog/products/demo-1/purchase-intent', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON().locale).toBe('en');
      purchaseIntentSeen = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { price: 12.99, currency: 'USD' } }),
      });
    });

    await page.route('**/api/orders', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON().productId).toBe('demo-1');
      orderCreated = true;
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ order: { id: 'order-1', status: 'pending', product_id: 'demo-1' } }),
      });
    });

    await page.route('**/api/orders/order-1/checkout', async (route) => {
      expect(route.request().method()).toBe('POST');
      checkoutStarted = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ session: { status: 'ready', url: '/mock-checkout/session-1' } }),
      });
    });

    await page.route('**/mock-checkout/session-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body><h1>Test Checkout</h1><p>Secure payment session</p></body></html>',
      });
    });

    await page.goto(appUrl('#/product/demo-1'));
    await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();
    await page.getByRole('button', { name: 'Purchase' }).click();

    await expect(page).toHaveURL(/\/mock-checkout\/session-1$/);
    await expect(page.getByRole('heading', { name: 'Test Checkout' })).toBeVisible();
    expect(purchaseIntentSeen).toBe(true);
    expect(orderCreated).toBe(true);
    expect(checkoutStarted).toBe(true);
  });

  test('buyer library exposes protected watch and download actions', async ({ page }) => {
    await mockBuyerSession(page);
    await page.route('**/api/library', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [{
            product_id: 'demo-1',
            title: 'Featured Video',
            description: 'Purchased video product.',
            streaming_enabled: true,
            download_enabled: true,
          }],
        }),
      });
    });

    await page.goto(appUrl('#/library'));
    await expect(page.getByRole('heading', { name: /buyer@example\.test.*library/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Watch' })).toHaveAttribute('href', '#/watch/demo-1');
    await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', '/api/media/demo-1/download');
  });

  test('buyer watch page uses the protected media stream endpoint', async ({ page }) => {
    await mockBuyerSession(page);
    await page.goto(appUrl('#/watch/demo-1'));

    await expect(page.getByRole('heading', { name: 'Watch video' })).toBeVisible();
    await expect(page.locator('video.secure-player')).toHaveAttribute('src', '/api/media/demo-1/stream');
    await expect(page.getByText('Playback is protected by your active entitlement.')).toBeVisible();
  });
});
