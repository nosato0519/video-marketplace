import { test, expect } from '@playwright/test';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/';

async function registerAndLogin(page, email, password) {
  await page.goto(`${appUrl}#/register`, { waitUntil: 'networkidle' });
  const form = page.locator('#auth-form');
  await expect(form).toBeVisible();
  await form.locator('input[name="email"]').fill(email);
  await form.locator('input[name="password"]').fill(password);
  await form.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/#\/browse/);
}

test.describe('real backend seller application acceptance', () => {
  test('buyer registers, logs in, and submits a real seller application', async ({ page }) => {
    const email = `buyer-${Date.now()}@example.test`;
    const password = 'TestPassword!123';

    const health = await page.request.get(`${backendUrl}/api/health`);
    expect(health.ok()).toBeTruthy();

    await registerAndLogin(page, email, password);
    await page.goto(`${appUrl}#/seller/register`, { waitUntil: 'networkidle' });
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
