import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';

const demoPort = 4174;
const demoUrl = `http://127.0.0.1:${demoPort}/`;
const artifactDir = 'tests/artifacts';

let demoProcess;

async function waitForDemo() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(demoUrl);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('Demo showcase server did not become ready');
}

test.beforeAll(async () => {
  demoProcess = spawn(process.execPath, ['demo/launcher.mjs'], {
    env: { ...process.env, PORT: String(demoPort) },
    stdio: 'ignore',
  });
  await waitForDemo();
});

test.afterAll(() => {
  if (demoProcess && !demoProcess.killed) demoProcess.kill('SIGTERM');
});

test.describe('rendered sales showcase visual evidence', () => {
  test('desktop showcase homepage renders for sales-demo review', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.goto(demoUrl);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toContainText('見つける。');
    await page.screenshot({ path: `${artifactDir}/showcase-desktop-home.png`, fullPage: true });
  });

  test('mobile showcase homepage renders for responsive review', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(demoUrl);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1')).toContainText('見つける。');
    await page.screenshot({ path: `${artifactDir}/showcase-mobile-home.png`, fullPage: true });
  });
});
