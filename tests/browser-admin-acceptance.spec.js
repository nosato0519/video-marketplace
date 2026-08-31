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
  test('logged-out admin access is blocked', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'authentication_required' }) });
    });
    await page.goto(appUrl('#/admin'));
    await expect(page.getByRole('heading', { name: 'Admin access required' })).toBeVisible();
  });

  test('authenticated admin can open the connected seller applications module', async ({ page }) => {
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

  test('authenticated admin can open the connected payouts module', async ({ page }) => {
    await mockAdminSession(page);
    await page.route('**/api/admin/payouts', async (route) => {
      await fulfillJson(route, {
        payouts: [{
          id: 'payout-1',
          seller_email: 'seller@example.test',
          amount: 96,
          currency: 'USD',
          status: 'pending'
        }]
      });
    });

    await page.goto(appUrl('#/admin/payouts'));
    await expect(page.getByRole('heading', { name: 'Payout operations' })).toBeVisible();
    await expect(page.getByText('seller@example.test')).toBeVisible();
  });
});
