import { test, expect } from '@playwright/test';

const modules = [
  '/app/i18n.js',
  '/app/catalog/catalog-view.js',
  '/app/catalog/catalog.js',
  '/app/auth/auth-view.js',
  '/app/auth/auth-api.js',
  '/app/checkout/checkout-api.js',
  '/app/library/library-view.js',
  '/app/seller/seller-dashboard.js',
  '/app/seller/seller-products.js',
  '/app/seller/seller-upload.js',
  '/app/seller/seller-earnings.js',
  '/app/seller/seller-payouts.js',
  '/app/seller/seller-profile.js',
  '/app/seller/seller-application-view.js',
  '/app/creators/creators-view.js',
  '/app/admin/admin-payouts.js',
  '/app/admin/admin-verifications.js',
  '/app/admin/seller-applications.js',
];

test('all application modules load in Chromium', async ({ page }) => {
  const result = await page.evaluate(async (urls) => {
    const failures = [];
    for (const url of urls) {
      try {
        await import(url);
      } catch (error) {
        failures.push({ url, message: String(error?.stack || error) });
      }
    }
    return failures;
  }, modules);
  expect(result, JSON.stringify(result, null, 2)).toEqual([]);
});
