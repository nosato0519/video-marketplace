import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

async function mockSellerSession(page) {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller' } }) });
  });
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

    await page.route('**/api/seller/profile', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { displayName: 'Seller One', legalName: 'Seller One LLC', countryCode: 'JP', verificationStatus: 'not_started' } }) });
        return;
      }
      expect(route.request().method()).toBe('PATCH');
      expect(route.request().postDataJSON().displayName).toBe('Seller Updated');
      profileSaved = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { displayName: 'Seller Updated', legalName: 'Seller One LLC', countryCode: 'JP', verificationStatus: 'not_started' } }) });
    });

    await page.route('**/api/seller/profile/submit-verification', async (route) => {
      expect(route.request().method()).toBe('POST');
      verificationSubmitted = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ profile: { verificationStatus: 'submitted' } }) });
    });

    await page.goto(appUrl('#/seller/profile'));
    await expect(page.getByRole('heading', { name: 'Profile & verification' })).toBeVisible();
    await page.getByLabel('Display name').fill('Seller Updated');
    await page.getByRole('button', { name: 'Save profile' }).click();
    expect(profileSaved).toBe(true);
    await page.getByRole('button', { name: 'Submit for verification' }).click();
    expect(verificationSubmitted).toBe(true);
  });

  test('seller dashboard exposes product and media management', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/dashboard', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ dashboard: { productCount: 1, publishedProductCount: 1, grossSales: 120, netEarnings: 96 } }) });
    });
    await page.route('**/api/seller/products', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ products: [{ id: 'product-1', title: 'Seller Video', status: 'published' }] }) });
    });

    await page.goto(appUrl('#/seller/dashboard'));
    await expect(page.getByRole('heading', { name: /Seller dashboard/i })).toBeVisible();
    await expect(page.getByText('Seller Video')).toBeVisible();
    await expect(page.getByText('published', { exact: true })).toBeVisible();
  });

  test('seller earnings page exposes payout state and earnings summary', async ({ page }) => {
    await mockSellerSession(page);
    await page.route('**/api/seller/earnings', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ summary: { grossSales: 120, platformFee: 24, netEarnings: 96, paidOut: 50, pendingPayout: 46 }, earnings: [] }) });
    });
    await page.route('**/api/seller/payouts', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ payouts: [{ id: 'payout-1', amount: 50, status: 'paid' }] }) });
    });

    await page.goto(appUrl('#/seller/earnings'));
    await expect(page.getByRole('heading', { name: /Earnings/i })).toBeVisible();
    await expect(page.getByText('¥96')).toBeVisible();
    await expect(page.getByText('paid', { exact: true })).toBeVisible();
  });
});
