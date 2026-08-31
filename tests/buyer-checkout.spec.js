import { test, expect } from '@playwright/test';

test('buyer checkout flow calls the authenticated purchase APIs', async ({ page }) => {
  const calls = [];

  await page.route('**/api/auth/me', async (route) => {
    calls.push('me');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { id: 'buyer-1', role: 'buyer' } }),
    });
  });

  await page.route('**/api/catalog/products/demo-1/purchase-intent', async (route) => {
    calls.push('purchase-intent');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: { price: 12.99, currency: 'USD' } }),
    });
  });

  await page.route('**/api/orders', async (route) => {
    calls.push('create-order');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ order: { id: 'order-browser-1' } }),
    });
  });

  await page.route('**/api/orders/order-browser-1/checkout', async (route) => {
    calls.push('checkout');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ session: { status: 'not_configured' } }),
    });
  });

  await page.goto('/app/index.html#/product/demo-1');
  await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();

  await page.getByRole('button', { name: 'Purchase' }).click();

  await expect(page.getByText(/Checkout provider is not configured yet/i)).toBeVisible();
  expect(calls).toEqual(['me', 'purchase-intent', 'create-order', 'checkout']);
});

test('buyer is redirected to login when the session is missing', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: 'Authentication required' } }),
    });
  });

  await page.goto('/app/index.html#/product/demo-1');
  await page.getByRole('button', { name: 'Purchase' }).click();

  await expect(page).toHaveURL(/#\/login\?return=\/product\/demo-1$/);
});
