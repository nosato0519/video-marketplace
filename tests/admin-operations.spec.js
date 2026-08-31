import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockAdmin(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'admin-1', email: 'admin@example.test', role: 'admin' } }) });
  });
}

async function json(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test.describe('admin browser acceptance', () => {
  test('admin dashboard exposes operational management sections', async ({ page }) => {
    await mockAdmin(page);
    await page.goto(appUrl('#/admin'));
    await expect(page.getByRole('heading', { name: 'Admin dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Payouts/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Seller applications/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Moderation/ })).toBeVisible();
  });

  test('admin can approve a pending seller application', async ({ page }) => {
    await mockAdmin(page);
    let reviewed = false;
    await page.route('**/api/admin/seller-applications?status=pending', async (route) => {
      await json(route, { applications: [{ id: 'application-1', email: 'creator@example.test', display_name: 'Creator', legal_name: 'Creator Legal', country_code: 'JP', message: 'Please approve', status: 'pending' }] });
    });
    await page.route('**/api/admin/seller-applications/application-1/review', async (route) => {
      expect(route.request().method()).toBe('POST');
      const body = route.request().postDataJSON();
      expect(body.action).toBe('approve');
      reviewed = true;
      await json(route, { application: { id: 'application-1', status: 'approved' } });
    });

    await page.goto(appUrl('#/admin/seller-applications'));
    await expect(page.getByText('creator@example.test')).toBeVisible();
    await page.locator('select[data-action="application-1"]').selectOption('approve');
    await page.getByRole('button', { name: 'Apply' }).click();
    expect(reviewed).toBe(true);
  });

  test('admin can move a payout through its next state and inspect audit events', async ({ page }) => {
    await mockAdmin(page);
    let statusUpdated = false;
    await page.route('**/api/admin/payouts', async (route) => {
      await json(route, { payouts: [{ id: 'payout-1', seller_email: 'seller@example.test', amount: 5000, currency: 'JPY', status: 'requested', requested_at: '2026-08-31T00:00:00Z' }] });
    });
    await page.route('**/api/admin/payouts/payout-1/status', async (route) => {
      expect(route.request().method()).toBe('POST');
      expect(route.request().postDataJSON().status).toBe('reviewing');
      statusUpdated = true;
      await json(route, { payout: { id: 'payout-1', status: 'reviewing' } });
    });
    await page.route('**/api/admin/payouts/payout-1/audit', async (route) => {
      await json(route, { events: [{ action: 'status_changed', actor_email: 'admin@example.test' }] });
    });

    await page.goto(appUrl('#/admin/payouts'));
    await expect(page.getByRole('heading', { name: 'Payout operations' })).toBeVisible();
    await page.locator('select[data-payout="payout-1"]').selectOption('reviewing');
    await page.getByRole('button', { name: 'Apply' }).click();
    expect(statusUpdated).toBe(true);
    await page.getByRole('button', { name: 'Audit' }).click();
    await expect(page.getByText(/Audit events: status_changed/)).toBeVisible();
  });

  test('non-admin is denied admin payout access', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'buyer-1', email: 'buyer@example.test', role: 'buyer' } }) });
    });
    await page.route('**/api/admin/payouts', async (route) => await json(route, { error: 'forbidden' }, 403));
    await page.goto(appUrl('#/admin/payouts'));
    await expect(page.getByRole('heading', { name: 'Admin access required' })).toBeVisible();
  });
});
