import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockAdminSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'admin-1', email: 'admin@example.test', role: 'admin' } }) });
  });
}

async function fulfillJson(route, body) {
  await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('admin browser acceptance', () => {
  test('logged-out admin dashboard redirects to login', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_required' }) });
    });
    await page.goto(appUrl('#/admin'));
    await expect(page).toHaveURL(/#\/login\?return=\/admin$/);
  });

  test('admin dashboard exposes operational management areas', async ({ page }) => {
    await mockAdminSession(page);
    await page.goto(appUrl('#/admin'));
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.locator('a[href="#/admin/users"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/admin/sellers"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/admin/products"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/admin/orders"]')).toHaveCount(1);
    await expect(page.locator('a[href="#/admin/payouts"]')).toHaveCount(1);
  });

  test('admin can review users and sellers', async ({ page }) => {
    await mockAdminSession(page);
    await page.route('**/api/admin/users*', async (route) => {
      await fulfillJson(route, { users: [{ id: 'user-1', email: 'buyer@example.test', role: 'buyer', status: 'active' }] });
    });
    await page.route('**/api/admin/sellers*', async (route) => {
      await fulfillJson(route, { sellers: [{ id: 'seller-1', email: 'seller@example.test', verification_status: 'submitted', status: 'active' }] });
    });

    await page.goto(appUrl('#/admin/users'));
    await expect(page.getByRole('heading', { name: 'User management' })).toBeVisible();
    await expect(page.getByText('buyer@example.test')).toBeVisible();

    await page.goto(appUrl('#/admin/sellers'));
    await expect(page.getByRole('heading', { name: 'Seller management' })).toBeVisible();
    await expect(page.getByText('seller@example.test')).toBeVisible();
  });

  test('admin can review products and orders', async ({ page }) => {
    await mockAdminSession(page);
    await page.route('**/api/admin/products*', async (route) => {
      await fulfillJson(route, { products: [{ id: 'product-1', title: 'Demo Video', status: 'published' }] });
    });
    await page.route('**/api/admin/orders*', async (route) => {
      await fulfillJson(route, { orders: [{ id: 'order-1', status: 'paid', total_amount: 120, currency: 'JPY' }] });
    });

    await page.goto(appUrl('#/admin/products'));
    await expect(page.getByRole('heading', { name: 'Product moderation' })).toBeVisible();
    await expect(page.getByText('Demo Video')).toBeVisible();

    await page.goto(appUrl('#/admin/orders'));
    await expect(page.getByRole('heading', { name: 'Order management' })).toBeVisible();
    await expect(page.getByText('order-1')).toBeVisible();
  });
});
