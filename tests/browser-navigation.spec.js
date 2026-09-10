import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

const PORT = 4184;
const BASE_URL = `http://127.0.0.1:${PORT}`;
let proxy;

async function waitForProxy() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) return;
    } catch {
      // Keep polling until the proxy is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('navigation proxy did not start');
}

test.beforeAll(async () => {
  proxy = spawn(process.execPath, ['demo/link-fix-proxy.mjs'], {
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
  await expect(page).toHaveURL(/\/pages\/video-list\.html$/);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.getByText('販売者ログイン', { exact: true }).click();
  await expect(page).toHaveURL(/\/pages\/seller-login\.html$/);

  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  await page.getByText('購入者ログイン', { exact: true }).click();
  await expect(page).toHaveURL(/\/pages\/buyer-login\.html$/);
});

test('homepage video card opens the product detail page by a real browser click', async ({ page }) => {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle' });
  const card = page.locator('.card').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/pages\/product-detail\.html\?id=\d+/);
});
