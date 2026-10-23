import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 4184;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let proxy;

async function waitForProxy() {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) return;
    } catch {
      // Keep polling until the proxy is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('navigation proxy did not start within 30 seconds');
}

test.beforeAll(async () => {
  proxy = spawn(process.execPath, ['demo/home-nav-proxy.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'ignore',
  });
  await waitForProxy();
});

test.afterAll(() => {
  proxy?.kill('SIGTERM');
});

test('homepage demo and role-login controls navigate by real browser clicks', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });

  await page.getByText('販売者デモ', { exact: true }).click();
  await expect(page).toHaveURL(/\/pages\/creator-studio\.html$/);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.getByText('購入者デモ', { exact: true }).click();
  await expect(page).toHaveURL(/\/pages\/register\.html\?returnTo=/);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.locator('.login-menu').hover();
  await page.locator('.login-dropdown button').filter({ hasText: '販売者ログイン' }).click();
  await expect(page).toHaveURL(/\/pages\/login\.html\?role=seller$/);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.locator('.login-menu').hover();
  await page.locator('.login-dropdown button').filter({ hasText: '購入者ログイン' }).click();
  await expect(page).toHaveURL(/\/pages\/login\.html\?role=buyer$/);
});

test('homepage video card opens the product detail page by a real browser click', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const card = page.locator('[data-video-id]').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/pages\/product-detail\.html\?(?:id|product)=\d+/);
});
