import { test, expect } from '@playwright/test';

const appUrl = '/app/index.html';

test.describe('showcase visual evidence', () => {
  test('desktop homepage renders for sales-demo review', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(appUrl);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'artifacts/showcase-desktop-home.png', fullPage: true });
  });

  test('mobile homepage renders for responsive review', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(appUrl);
    await expect(page.locator('body')).toBeVisible();
    await page.screenshot({ path: 'artifacts/showcase-mobile-home.png', fullPage: true });
  });
});
