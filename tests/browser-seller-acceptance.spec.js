import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }) });
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
    await expect(page.getByDisplayValue('Seller Updated')).toBeVisible();
    expect(profileSaved).toBe(true);
    await page.getByRole('button', { name: 'Submit for verification' }).click();
    expect(verificationSubmitted).toBe(true);
  });

  test('seller dashboard exposes the video business management areas', async ({ page }) => {
    await mockSellerSession(page);
    await page.goto(appUrl('#/seller'));
    await expect(page.getByRole('heading', { name: 'Seller dashboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Upload video/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /My videos/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Sales & earnings/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Payouts/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Seller profile/ })).toBeVisible();
  });

  test('seller earnings page exposes earnings summary', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/earnings', async (route) => {
      await fulfillJson(route, { summary: { earned_amount: 96, available_amount: 46, paid_amount: 50, sale_count: 2 }, earnings: [{ order_id: 'order-1', gross_amount: 120, platform_fee: 24, net_amount: 96, currency: 'JPY', status: 'paid', created_at: '2026-08-31T00:00:00Z' }] });
    });

    await page.goto(appUrl('#/seller/sales'));
    await expect(page.getByRole('heading', { name: 'Sales & earnings' })).toBeVisible();
    await expect(page.getByText('￥96')).toBeVisible();
    await expect(page.getByText('paid', { exact: true })).toBeVisible();
    await expect(page.getByText('order-1')).toBeVisible();
  });
});
