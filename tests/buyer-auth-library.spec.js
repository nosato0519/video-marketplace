import { test, expect } from '@playwright/test';

const buyerEmail = `buyer-${Date.now()}@example.com`;
const buyerPassword = 'BuyerPassword123!';

test('buyer can register, sign in, and reach the protected library', async ({ page }) => {
  await page.goto('/app/index.html#/register');

  await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  await page.getByLabel('Email').fill(buyerEmail);
  await page.getByLabel('Password').fill(buyerPassword);

  const registerResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/register') && response.request().method() === 'POST'
  );
  await page.getByRole('button', { name: 'Create account' }).click();
  await registerResponse;

  await expect(page).toHaveURL(/#\/browse$/);

  await page.goto('/app/index.html#/library');
  const meResponse = page.waitForResponse((response) =>
    response.url().includes('/api/auth/me') && response.request().method() === 'GET'
  );
  await page.reload();
  await meResponse;

  await expect(page.getByRole('heading', { name: new RegExp(`${buyerEmail}.*library`) })).toBeVisible();
});

test('unauthenticated buyer is redirected from the library to login', async ({ page }) => {
  await page.goto('/app/index.html#/library');

  await expect(page).toHaveURL(/#\/login\?return=%2Flibrary$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
