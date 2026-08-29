import { test, expect } from '@playwright/test';

const modules = [
  './i18n.js',
  './catalog/catalog-view.js',
  './catalog/catalog.js',
  './auth/auth-view.js',
  './auth/auth-api.js',
  './checkout/checkout-api.js',
  './library/library-view.js',
  './seller/seller-dashboard.js',
  './seller/seller-products.js',
  './seller/seller-upload.js',
  './seller/seller-earnings.js',
  './seller/seller-payouts.js',
  './seller/seller-profile.js',
  './seller/seller-application-view.js',
  './creators/creators-view.js',
  './admin/admin-payouts.js',
  './admin/admin-verifications.js',
  './admin/seller-applications.js',
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
