import { test, expect } from '@playwright/test';

async function mockDemoCatalog(page) {
  await page.route('**/api/catalog/products?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: [{
          id: 'demo-1',
          title: 'Featured Video',
          seller: 'Creator Studio',
          category: 'Featured',
          price_amount: 12.99,
          price_currency: 'USD',
        }],
        pagination: { page: 1, limit: 24, returned: 1, hasMore: false },
      }),
    });
  });

  await page.route('**/api/catalog/products/demo-1?*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'demo-1',
          title: 'Featured Video',
          seller: 'Creator Studio',
          category: 'Featured',
          description: 'Demo product for browser acceptance.',
          price_amount: 12.99,
          price_currency: 'USD',
        },
      }),
    });
  });
}

test('buyer can discover a demo product and reach its product page', async ({ page }) => {
  await mockDemoCatalog(page);
  await page.goto('/app/index.html#/browse');

  await expect(page).toHaveTitle('Video Market');
  await expect(page.getByRole('heading', { name: /discover|video/i }).first()).toBeVisible();
  await expect(page.getByText('Featured Video')).toBeVisible();

  await page.getByText('Featured Video').click();
  await expect(page).toHaveURL(/#\/product\/demo-1$/);
  await expect(page.getByRole('heading', { name: 'Featured Video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Purchase' })).toBeVisible();
});
