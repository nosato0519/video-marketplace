import { test, expect } from '@playwright/test';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/';

async function registerAndLogin(page, email, password) {
  const consoleErrors = [];
  const failedRequests = [];
  page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(`console: ${message.text()}`); });
  page.on('requestfailed', (request) => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'unknown'}`));

  const indexResponse = await page.request.get(appUrl);
  expect(indexResponse.ok(), await indexResponse.text()).toBeTruthy();
  expect(indexResponse.headers()['content-type']).toContain('text/html');
  const indexHtml = await indexResponse.text();
  expect(indexHtml).toContain('/app/main.js');

  const mainResponse = await page.request.get(`${appUrl}app/main.js`);
  expect(mainResponse.ok(), await mainResponse.text()).toBeTruthy();
  expect(mainResponse.headers()['content-type']).toContain('javascript');
  const mainJs = await mainResponse.text();
  expect(mainJs).toContain("document.querySelector('#app')");

  await page.goto(appUrl, { waitUntil: 'domcontentloaded' });
  const moduleProbe = await page.evaluate(async () => {
    try {
      await import(`/app/main.js?browser-probe=${Date.now()}`);
      return { ok: true, error: null };
    } catch (error) {
      return { ok: false, error: `${error?.name || 'Error'}: ${error?.message || error}` };
    }
  });
  expect(moduleProbe.ok, `main.js browser module probe failed: ${moduleProbe.error}; consoleErrors=${JSON.stringify(consoleErrors)} failedRequests=${JSON.stringify(failedRequests)}`).toBeTruthy();

  await expect.poll(async () => page.locator('#app').innerHTML(), { timeout: 10000 }).toContain('VIDEO MARKET');
  await expect(page.locator('.site-header')).toBeVisible();
  await page.getByRole('link', { name: 'Sign up' }).click();
  await expect(page).toHaveURL(/#\/register/);
  const form = page.locator('#auth-form');
  await expect(form).toBeVisible();
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/#\/browse/);
  expect(consoleErrors, failedRequests.join('\n')).toEqual([]);
  expect(failedRequests).toEqual([]);
}

test.describe('real backend seller application acceptance', () => {
  test('buyer registers, logs in, and submits a real seller application', async ({ page }) => {
    const email = `buyer-${Date.now()}@example.test`;
    const password = 'TestPassword!123';

    const health = await page.request.get(`${backendUrl}/api/health`);
    expect(health.ok()).toBeTruthy();

    await registerAndLogin(page, email, password);
    await page.goto(`${appUrl}#/seller/register`, { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Start selling your videos' })).toBeVisible();

    const form = page.locator('#seller-application-form');
    await expect(form).toBeVisible();
    await form.locator('input[name="displayName"]').fill('Real Backend Creator');
    await form.locator('input[name="legalName"]').fill('Real Backend Creator Legal');
    await form.locator('input[name="countryCode"]').fill('JP');
    await form.locator('textarea[name="message"]').fill('Real backend browser acceptance.');

    const submitResponse = page.waitForResponse((response) => response.url().endsWith('/api/seller/application') && response.request().method() === 'POST');
    await form.getByRole('button', { name: 'Submit application' }).click();
    expect((await submitResponse).ok()).toBeTruthy();

    const response = await page.request.get(`${backendUrl}/api/seller/application`);
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.application).toBeTruthy();
    expect(body.application.status).toBe('pending');
    expect(body.application.displayName).toBe('Real Backend Creator');
    expect(body.application.legalName).toBe('Real Backend Creator Legal');
    expect(body.application.countryCode).toBe('JP');

    const me = await page.request.get(`${backendUrl}/api/auth/me`);
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    expect(meBody.user.email).toBe(email);
    expect(meBody.user.role).toBe('buyer');
  });
});
