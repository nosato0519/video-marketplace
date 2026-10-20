import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { query } from '../backend/src/db.js';

const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/app/index.html';
const sellerRegisterUrl = 'http://127.0.0.1:4173/pages/seller-register.html';

async function registerAndLogin(page, email, password) {
  await page.goto(appUrl + '#/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /Register|Create account/i }).click();
  await expect.poll(() => page.url()).toContain('#/browse');
}

async function login(page, email, password) {
  await page.goto(appUrl + '#/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: /Log in|Login|Sign in/i }).click();
  await expect.poll(() => page.url()).toContain('#/browse');
}

async function registerSeller(page, email, password) {
  await page.goto(sellerRegisterUrl);
  await page.getByLabel('クリエイター名').fill('Dedicated Seller Creator');
  await page.getByLabel('法的氏名').fill('Dedicated Seller Legal Name');
  await page.getByLabel('国/地域コード（2文字）').fill('JP');
  await page.getByLabel('メールアドレス').fill(email);
  await page.getByLabel('パスワード', { exact: true }).fill(password);
  await page.getByLabel('パスワード（確認）').fill(password);
  await page.getByLabel(/利用規約・プライバシーポリシーに同意する/).check();
  await page.getByRole('button', { name: '販売者アカウントを作成' }).click();
}

test.describe('role-specific registration acceptance', () => {
  test('buyer registration remains buyer-only', async ({ page }) => {
    const email = 'buyer-' + crypto.randomUUID() + '@example.test';
    const password = 'TestPassword!123';
    await registerAndLogin(page, email, password);

    const applicationResponse = await page.request.post(backendUrl + '/api/seller/application', {
      data: { displayName: 'Buyer Must Not Become Seller', legalName: 'Buyer Legal Name', countryCode: 'JP' },
    });
    expect(applicationResponse.status()).toBe(403);

    const me = await page.request.get(backendUrl + '/api/auth/me');
    expect(me.ok()).toBeTruthy();
    expect((await me.json()).user).toMatchObject({ role: 'buyer', status: 'active' });
    expect((await page.request.get(backendUrl + '/api/seller/products')).status()).toBe(403);
  });

  test('seller registration creates a pending seller and rejects duplicate email', async ({ page }) => {
    const email = 'seller-' + crypto.randomUUID() + '@example.test';
    const password = 'TestPassword!123';
    expect((await page.request.get(backendUrl + '/api/health')).ok()).toBeTruthy();

    await registerSeller(page, email, password);
    await expect(page.locator('#seller-register-message')).toContainText('運営者の承認後');
    const seller = await query('SELECT id, role, status FROM users WHERE email_normalized = $1 LIMIT 1', [email]);
    expect(seller.rows).toHaveLength(1);
    expect(seller.rows[0]).toMatchObject({ role: 'seller', status: 'suspended' });

    const application = await query('SELECT user_id, status, legal_name FROM seller_applications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [seller.rows[0].id]);
    expect(application.rows).toHaveLength(1);
    expect(application.rows[0]).toMatchObject({ status: 'pending', legal_name: 'Dedicated Seller Legal Name' });

    const duplicate = await page.request.post(backendUrl + '/api/auth/register-seller', {
      data: { email, password, displayName: 'Duplicate Seller', legalName: 'Duplicate Legal Name', countryCode: 'JP' },
    });
    expect(duplicate.status()).toBe(409);
    expect((await duplicate.json()).error.code).toBe('EMAIL_ALREADY_REGISTERED');
    expect((await page.request.get(backendUrl + '/api/auth/me')).status()).toBe(401);
  });

  test('operator approval activates seller without converting buyer account', async ({ page }) => {
    const suffix = crypto.randomUUID();
    const sellerEmail = 'seller-' + suffix + '@example.test';
    const buyerEmail = 'buyer-' + suffix + '@example.test';
    const adminEmail = 'admin-' + suffix + '@example.test';
    const password = 'TestPassword!123';

    await registerSeller(page, sellerEmail, password);
    await expect(page.locator('#seller-register-message')).toContainText('運営者の承認後');
    await registerAndLogin(page, buyerEmail, password);
    const buyerBefore = await query('SELECT role, status FROM users WHERE email_normalized = $1 LIMIT 1', [buyerEmail]);
    expect(buyerBefore.rows[0]).toMatchObject({ role: 'buyer', status: 'active' });

    const sellerRow = await query('SELECT password_hash, role, status FROM users WHERE email_normalized = $1 LIMIT 1', [sellerEmail]);
    expect(sellerRow.rows[0]).toMatchObject({ role: 'seller', status: 'suspended' });
    await query("INSERT INTO users (email, email_normalized, password_hash, role, status) VALUES ($1, $1, $2, 'admin', 'active')", [adminEmail, sellerRow.rows[0].password_hash]);

    await login(page, adminEmail, password);
    await page.goto(appUrl + '#/admin/seller-applications');
    await expect(page.getByRole('heading', { name: /Seller applications/i })).toBeVisible();
    const row = page.locator('tbody tr').filter({ hasText: sellerEmail }).first();
    await expect(row).toBeVisible();
    await row.locator('select[data-action]').selectOption('approve');
    await row.getByRole('button', { name: 'Apply' }).click();

    const approved = await query('SELECT role, status FROM users WHERE email_normalized = $1 LIMIT 1', [sellerEmail]);
    expect(approved.rows[0]).toMatchObject({ role: 'seller', status: 'active' });
    const buyerAfter = await query('SELECT role, status FROM users WHERE email_normalized = $1 LIMIT 1', [buyerEmail]);
    expect(buyerAfter.rows[0]).toMatchObject({ role: 'buyer', status: 'active' });

    await login(page, sellerEmail, password);
    const me = await page.request.get(backendUrl + '/api/auth/me');
    expect(me.ok()).toBeTruthy();
    expect((await me.json()).user).toMatchObject({ role: 'seller', status: 'active' });
  });
});
