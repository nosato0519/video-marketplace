import { test, expect } from '@playwright/test';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/app/index.html';

async function registerAndLogin(page, email, password) {
  await page.goto(`${appUrl}#/register`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /Register|Create account/i }).click();
  await expect(page).toHaveURL(/#\/browse/);
}

test.describe('real backend seller application acceptance', () => {
  test('buyer registers, logs in, and submits a real seller application', async ({ page }) => {
    const email = `buyer-${Date.now()}@example.test`;
    const password = 'TestPassword!123';

    const health = await page.request.get(`${backendUrl}/api/health`);
    expect(health.ok()).toBeTruthy();

    await registerAndLogin(page, email, password);
    await page.goto(`${appUrl}#/seller/register`);
    await expect(page.getByRole('heading', { name: 'Start selling your videos' })).toBeVisible();

    await page.getByLabel('Display name').fill('Real Backend Creator');
    await page.getByLabel('Legal name').fill('Real Backend Creator Legal');
    await page.getByLabel('Country code').fill('JP');
    await page.getByLabel(/Message/).fill('Real backend browser acceptance.');
    await page.getByRole('button', { name: 'Submit application' }).click();

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
