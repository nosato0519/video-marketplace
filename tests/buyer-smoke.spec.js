import { test, expect } from '@playwright/test';

test('buyer can discover a demo product and reach its product page', async ({ page }) => {
  await page.goto('/app/index.html#/browse');

  await expect(page).toHaveTitle('Video Market');
  await expect(page.getByRole('heading', { name: /discover|video/i }).first()).toBeVisible();
  await expect(page.getByText('Featured Video')).toBeVisible();

  await page.getByText('Featured Video').click();
  await expect(page).toHaveURL(/#\/product\/demo-1$/);
  await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Purchase' })).toBeVisible();
});
