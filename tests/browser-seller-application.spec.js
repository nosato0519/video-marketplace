import { test, expect } from '@playwright/test';

test('seller registration uses its dedicated endpoint', async ({ page }) => {
  let registrationBody;
  await page.route('**/api/auth/register-seller', async (route) => {
    registrationBody = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ application: { id: 'application-1', status: 'pending' } }) });
  });
  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'wrong_registration_route' }) });
  });

  await page.goto('/pages/seller-register.html');
  await page.getByLabel('クリエイター名').fill('Test Creator');
  await page.getByLabel('法的氏名').fill('Test Creator Legal');
  await page.getByLabel('国/地域コード（2文字）').fill('JP');
  await page.getByLabel('メールアドレス').fill('seller@example.test');
  await page.getByLabel('パスワード', { exact: true }).fill('SellerPassword123!');
  await page.getByLabel('パスワード（確認）').fill('SellerPassword123!');
  await page.getByLabel(/利用規約・プライバシーポリシーに同意する/).check();
  await page.getByRole('button', { name: '販売者アカウントを作成' }).click();

  await expect(page.locator('#seller-register-message')).toContainText('運営者の承認後');
  expect(registrationBody).toEqual({ email: 'seller@example.test', password: 'SellerPassword123!', displayName: 'Test Creator', legalName: 'Test Creator Legal', countryCode: 'JP' });
});

test('old seller application route redirects to dedicated registration', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'buyer-1', email: 'buyer@example.test', role: 'buyer', status: 'active' } }) });
  });
  await page.goto('/app/index.html#/seller/register');
  await expect(page).toHaveURL(/pages\/seller-register\.html$/);
});

test('admin can approve a pending seller registration', async ({ page }) => {
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: { id: 'admin-1', email: 'admin@example.test', role: 'admin', status: 'active' } }) });
  });
  await page.route('**/api/admin/seller-applications?status=pending', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [{ id: 'application-1', status: 'pending', email: 'seller@example.test', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: null }] }) });
  });
  await page.route('**/api/admin/seller-applications/application-1/review', async (route) => {
    expect(route.request().postDataJSON().action).toBe('approve');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ application: { id: 'application-1', status: 'approved' } }) });
  });
  await page.route('**/api/admin/seller-applications?status=approved', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ applications: [{ id: 'application-1', status: 'approved', email: 'seller@example.test', display_name: 'Test Creator', legal_name: 'Test Creator Legal', country_code: 'JP', message: null }] }) });
  });

  await page.goto('/app/index.html#/admin/seller-applications');
  await expect(page.getByRole('heading', { name: 'Seller applications' })).toBeVisible();
  const row = page.locator('tbody tr').filter({ hasText: 'seller@example.test' }).first();
  await row.locator('select[data-action]').selectOption('approve');
  await row.getByRole('button', { name: 'Apply' }).click();
});

test('seller login rejects buyer accounts and opens the seller dashboard for sellers', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    const { email } = route.request().postDataJSON();
    const role = email === 'seller@example.test' ? 'seller' : 'buyer';
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: role + '-1', email, role, status: 'active' } }),
    });
  });
  await page.route('**/api/auth/logout', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller', status: 'active' } }),
    });
  });

  await page.goto('/pages/seller-login.html');
  await page.getByLabel('メールアドレス').fill('buyer@example.test');
  await page.getByLabel('パスワード').fill('BuyerPassword123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page.locator('#login-message')).toContainText('販売者アカウントではありません。');
  await expect(page).toHaveURL(/pages\/seller-login\.html$/);

  await page.getByLabel('メールアドレス').fill('seller@example.test');
  await page.getByLabel('パスワード').fill('SellerPassword123!');
  await page.getByRole('button', { name: 'ログイン' }).click();
  await expect(page).toHaveURL(/\/seller\/dashboard\.html$/);
});


test('approved seller can sign in through buyer login and open buyer pages', async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    const { email } = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'seller-1', email, role: 'seller', status: 'active' } }),
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ user: { id: 'seller-1', email: 'seller@example.test', role: 'seller', status: 'active' } }),
    });
  });

  await page.goto('/pages/buyer-login.html');
  await page.getByLabel('メールアドレス').fill('seller@example.test');
  await page.getByLabel('パスワード').fill('SellerPassword123!');
  await page.getByRole('button', { name: 'ログイン' }).click();

  await expect(page).toHaveURL(/\/pages\/buyer\.html$/);
});
