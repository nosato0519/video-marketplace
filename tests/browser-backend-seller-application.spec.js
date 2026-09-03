import { test, expect } from '@playwright/test';
import { query } from '../backend/src/db.js';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/app/index.html';

async function registerAndLogin(page, email, password) {
  await page.goto(`${appUrl}#/register`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /Register|Create account/i }).click();
  await expect(page).toHaveURL(/#\/browse/);
}

async function login(page, email, password) {
  await page.goto(`${appUrl}#/login`);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /Login|Sign in/i }).click();
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

    await expect(page.getByRole('heading', { name: 'Pending review' })).toBeVisible();
    await expect(page.getByText('Real Backend Creator', { exact: true })).toBeVisible();

    const me = await page.request.get(`${backendUrl}/api/auth/me`);
    expect(me.ok()).toBeTruthy();
    const meBody = await me.json();
    expect(meBody.user.email).toBe(email);
    expect(meBody.user.role).toBe('buyer');
  });

  test('admin reviews the submitted seller application through the real backend', async ({ page }) => {
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const sellerEmail = `seller-${suffix}@example.test`;
    const adminEmail = `admin-${suffix}@example.test`;
    const password = 'TestPassword!123';

    const health = await page.request.get(`${backendUrl}/api/health`);
    expect(health.ok()).toBeTruthy();

    await registerAndLogin(page, sellerEmail, password);
    await page.goto(`${appUrl}#/seller/register`);
    await page.getByLabel('Display name').fill('Real Backend Admin Review Seller');
    await page.getByLabel('Legal name').fill('Real Backend Admin Review Seller Legal');
    await page.getByLabel('Country code').fill('JP');
    await page.getByLabel(/Message/).fill('Real backend admin review acceptance.');
    await page.getByRole('button', { name: 'Submit application' }).click();
    await expect(page.getByRole('heading', { name: 'Pending review' })).toBeVisible();

    const sellerMe = await page.request.get(`${backendUrl}/api/auth/me`);
    expect(sellerMe.ok()).toBeTruthy();
    const sellerBody = await sellerMe.json();
    expect(sellerBody.user.email).toBe(sellerEmail);
    expect(sellerBody.user.role).toBe('buyer');

    const adminRegister = await page.request.post(`${backendUrl}/api/auth/register`, {
      data: { email: adminEmail, password },
    });
    expect(adminRegister.status()).toBe(201);
    const adminBody = await adminRegister.json();
    const adminId = adminBody.user.id;
    await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);

    await login(page, adminEmail, password);
    await page.goto(`${appUrl}#/admin/seller-applications`);
    await expect(page.getByRole('heading', { name: /Seller applications/i })).toBeVisible();
    await expect(page.getByText(sellerEmail, { exact: true })).toBeVisible();

    const applicationRow = page.locator('[data-application-id]').filter({ hasText: sellerEmail }).first();
    const actionSelect = applicationRow.locator('select');
    await actionSelect.selectOption('approve');
    await applicationRow.getByRole('button', { name: 'Apply' }).click();

    await expect(page.getByText(/approved/i)).toBeVisible();
    const applications = await page.request.get(`${backendUrl}/api/admin/seller-applications?status=approved`);
    expect(applications.ok()).toBeTruthy();
    const approvedBody = await applications.json();
    expect(approvedBody.applications.some((application) => application.email === sellerEmail && application.status === 'approved')).toBe(true);
  });
});
