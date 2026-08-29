import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockBuyerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'buyer-1', email: 'buyer@example.test', role: 'buyer' } }) });
  });
}

async function mockAdminSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'admin-1', email: 'admin@example.test', role: 'admin' } }) });
  });
}

test.describe('seller application browser acceptance', () => {
  test('buyer can submit a seller application and see pending status', async ({ page }) => {
    let application = null;
    await mockBuyerSession(page);
    await page.route('**/api/seller/application', async (route) => {
      if (route.request().method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ application }) });
      }
      if (route.request().method() === 'POST') {
        application = { id: 'application-1', status: 'pending', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: 'I want to sell video products.' };
        return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ application }) });
      }
      return route.fallback();
    });

    await page.goto(appUrl('#/seller/register'));
    await expect(page.getByRole('heading', { name: 'Start selling your videos' })).toBeVisible();
    await page.getByLabel('Display name').fill('Test Creator');
    await page.getByLabel('Legal name').fill('Test Creator Legal');
    await page.getByLabel('Country code').fill('JP');
    await page.getByLabel(/Message/).fill('I want to sell video products.');
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Pending review' })).toBeVisible();
    await expect(page.getByText('Test Creator', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Withdraw application' })).toBeVisible();
  });

  test('admin can review and approve a pending seller application', async ({ page }) => {
    let status = 'pending';
    await mockAdminSession(page);
    await page.route('**/api/admin/seller-applications?status=pending', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: status === 'pending' ? [{ id: 'application-1', status, email: 'buyer@example.test', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: 'I want to sell video products.' }] : [] }) });
    });
    await page.route('**/api/admin/seller-applications/application-1/review', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON().action).toBe('approve');
      status = 'approved';
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ application: { id: 'application-1', status: 'approved' } }) });
    });
    await page.route('**/api/admin/seller-applications?status=approved', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [{ id: 'application-1', status: 'approved', email: 'buyer@example.test', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: 'I want to sell video products.' }] }) });
    });

    await page.goto(appUrl('#/admin/seller-applications'));
    await expect(page.getByRole('heading', { name: 'Seller applications' })).toBeVisible();
    await expect(page.getByText('buyer@example.test')).toBeVisible();
    await page.locator('select[data-action="application-1"]').selectOption('approve');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.getByRole('heading', { name: 'Seller applications' })).toBeVisible();
  });

  test('admin rejection requires a review note', async ({ page }) => {
    await mockAdminSession(page);
    await page.route('**/api/admin/seller-applications?status=pending', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [{ id: 'application-1', status: 'pending', email: 'buyer@example.test', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: '' }] }) });
    });

    await page.goto(appUrl('#/admin/seller-applications'));
    await page.locator('select[data-action="application-1"]').selectOption('reject');
    await page.getByRole('button', { name: 'Apply' }).click();
    await expect(page.locator('#seller-application-admin-message')).toHaveText('A note is required for rejection.');
  });
});
