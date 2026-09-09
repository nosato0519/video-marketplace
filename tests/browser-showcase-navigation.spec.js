import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

const demoPort = 4175;
const demoUrl = `http://127.0.0.1:${demoPort}/`;
let demoProcess;

async function waitForDemo() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(demoUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Navigation demo server did not become ready');
}

test.beforeAll(async () => {
  demoProcess = spawn(process.execPath, ['link-fix-proxy.mjs'], {
    cwd: 'demo',
    env: { ...process.env, PORT: String(demoPort) },
    stdio: 'ignore',
  });
  await waitForDemo();
});

test.afterAll(() => {
  if (demoProcess && !demoProcess.killed) demoProcess.kill('SIGTERM');
});

test.describe('sales showcase navigation', () => {
  test('homepage role and discovery links navigate correctly', async ({ page }) => {
    await page.goto(demoUrl);
    await page.getByText('販売者デモ', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/creator-studio\.html$/);

    await page.goto(demoUrl);
    await page.getByText('購入者デモ', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/library\.html$/);

    await page.goto(demoUrl);
    await page.getByRole('link', { name: '動画を探す' }).first().click();
    await expect(page).toHaveURL(/\/pages\/video-list\.html$/);

    await page.goto(demoUrl);
    await page.getByRole('link', { name: 'クリエイターになる' }).click();
    await expect(page).toHaveURL(/\/pages\/creator-studio\.html$/);
  });

  test('buyer journey connects list, detail, checkout, library and watch', async ({ page }) => {
    await page.goto(`${demoUrl}pages/video-list.html`);
    await page.locator('.card').first().click();
    await expect(page).toHaveURL(/\/pages\/product-detail\.html$/);

    await page.getByText('この動画を購入する', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/checkout\.html$/);

    await page.goto(`${demoUrl}pages/library.html`);
    await page.getByText('視聴する', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/watch\.html$/);

    await page.getByText('ライブラリへ', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/library\.html$/);
  });

  test('account, orders and authentication links connect', async ({ page }) => {
    await page.goto(`${demoUrl}pages/account.html`);
    await page.getByText('購入履歴を見る', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/orders\.html$/);

    await page.goto(`${demoUrl}pages/account.html`);
    await page.getByText('ログイン画面', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/login\.html$/);

    await page.goto(`${demoUrl}pages/login.html`);
    await page.getByText(/新規|登録/).first().click();
    await expect(page).toHaveURL(/\/pages\/register\.html$/);

    await page.getByText('ログイン', { exact: true }).click();
    await expect(page).toHaveURL(/\/pages\/login\.html$/);
  });
});
