import { test, expect } from '@playwright/test';

const appUrl = (hash) => `/app/index.html${hash}`;

const routes = [
  { hash: '#/', heading: 'Discover videos worth watching.' },
  { hash: '#/browse', heading: 'Discover' },
  { hash: '#/categories', heading: 'Explore categories' },
  { hash: '#/popular', heading: 'Popular now' },
  { hash: '#/creators', heading: 'Discover creators' },
  { hash: '#/login', heading: 'Log in' },
  { hash: '#/register', heading: 'Create your account' },
];

test.describe('public marketplace browser smoke', () => {
  test('loads the application shell and public routes', async ({ page }) => {
    for (const route of routes) {
      await page.goto(appUrl(route.hash));
      await expect(page.locator('#app')).toBeVisible();
      await expect(page.locator('body')).toContainText(route.heading);
    }
  });

  test('primary navigation exposes buyer and creator entry points', async ({ page }) => {
    await page.goto(appUrl('#/'));
    await expect(page.getByRole('link', { name: /Discover/i })).toHaveAttribute('href', '#/browse');
    await expect(page.getByRole('link', { name: /Categories/i })).toHaveAttribute('href', '#/categories');
    await expect(page.getByRole('link', { name: /Popular/i })).toHaveAttribute('href', '#/popular');
    await expect(page.getByRole('link', { name: /Creators/i })).toHaveAttribute('href', '#/creators');
    await expect(page.getByRole('link', { name: /Become a creator/i })).toHaveAttribute('href', '#/seller/register');
  });

  test('creator discovery links back into the seller entry point', async ({ page }) => {
    await page.goto(appUrl('#/creators'));
    await expect(page.getByRole('heading', { name: 'Discover creators' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Become a creator' })).toHaveAttribute('href', '#/seller/register');
  });
});
