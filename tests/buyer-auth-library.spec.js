import { test, expect } from '@playwright/test';

async function json(route, body, status = 200) {
  await route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
}

test('buyer can register, sign in, and reach the protected library', async ({ page }) => {
  const buyerEmail = `buyer-${Date.now()}@example.com`;
  const buyerPassword = 'BuyerPassword123!';

  await page.route('**/api/auth/register', async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().postDataJSON()).toEqual({ email: buyerEmail, password: buyerPassword });
    await json(route, { user: { id: 'buyer-1', email: buyerEmail, role: 'buyer' } }, 201);
  });
  await page.route('**/api/auth/me', async (route) => {
    expect(route.request().method()).toBe('GET');
    await json(route, { user: { id: 'buyer-1', email: buyerEmail, role: 'buyer' } });
  });
  await page.route('**/api/library', async (route) => {
    await json(route, { items: [] });
  });

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
  await expect(page.getByRole('heading', { name: 'My Library' })).toBeVisible();
});

test('unauthenticated buyer is redirected from the library to login', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await json(route, { error: { message: 'Authentication required' } }, 401);
  });

  await page.goto('/app/index.html#/library');
  await expect(page).toHaveURL(/#\/login\?return=\/library$/);
  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
});
