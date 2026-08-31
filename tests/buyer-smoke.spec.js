import { test, expect } from '@playwright/test';

test('buyer can open the marketplace browse page', async ({ page }) => {
  await page.goto('/app/index.html#/browse');

  await expect(page).toHaveTitle('Video Market');
  await expect(page.getByRole('heading', { name: /discover|video/i }).first()).toBeVisible();
  await expect(page.locator('body')).toContainText(/browse|discover|video/i);
});
