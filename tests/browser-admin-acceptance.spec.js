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

  test('admin dashboard exposes the current operational navigation', async ({ page }) => {
    await mockAdminSession(page);
    await page.goto(appUrl('#/admin'));
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    const paths = [
      '#/admin', '#/admin/orders', '#/admin/products', '#/admin/sellers',
      '#/admin/seller-applications', '#/admin/buyers', '#/admin/moderation',
      '#/admin/reports', '#/admin/payouts', '#/admin/discounts', '#/admin/categories',
      '#/admin/localization', '#/admin/regions', '#/admin/content', '#/admin/settings',
      '#/admin/activity', '#/admin/help'
    ];
    for (const path of paths) {
      await expect(page.locator(`a[href="${path}"]`)).toHaveCount(1);
    }
  });

  test('admin can review seller applications', async ({ page }) => {
    await mockAdminSession(page);
    await page.route('**/api/admin/seller-applications?status=pending', async (route) => {
      await fulfillJson(route, {
        applications: [{
          id: 'application-1',
          email: 'seller@example.test',
          display_name: 'Seller One',
          legal_name: 'Seller One LLC',
          country_code: 'JP',
          message: 'Please review my application.',
          status: 'pending'
        }]
      });
    });

    await page.goto(appUrl('#/admin/seller-applications'));
    await expect(page.getByRole('heading', { name: 'Seller applications' })).toBeVisible();
    await expect(page.getByText('seller@example.test')).toBeVisible();
    await expect(page.getByText('Seller One LLC')).toBeVisible();
  });
});
