import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';
import { Pool } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendUrl = process.env.BROWSER_BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173/app/index.html';
const mediaDir = process.env.MEDIA_STORAGE_DIR || path.join(__dirname, '..', 'backend', 'media-data');
const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET || 'ci-payment-webhook-secret';

function signedPayload(payload) {
  return crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
}

test.describe('real backend buyer purchase browser acceptance', () => {
  test('buyer registers, purchases, settles, and accesses protected media', async ({ page }) => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const ids = {
      buyer: crypto.randomUUID(),
      seller: crypto.randomUUID(),
      media: crypto.randomUUID(),
      product: crypto.randomUUID(),
      payment: null,
    };
    const email = `buyer-${ids.buyer}@example.com`;
    const sellerEmail = `seller-${ids.seller}@example.com`;
    const mediaFilename = `${ids.media}.mp4`;
    const mediaPath = path.join(mediaDir, mediaFilename);
    const fixture = Buffer.from('browser-backend-buyer-fixture');
    let orderId = null;
    let providerPaymentId = null;
    let eventId = null;

    try {
      fs.mkdirSync(mediaDir, { recursive: true });
      fs.writeFileSync(mediaPath, fixture);

      await pool.query('BEGIN');
      await pool.query(
        `INSERT INTO users (id, email, email_normalized, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'seller', 'active')`,
        [ids.seller, sellerEmail, sellerEmail.toLowerCase(), 'test-password-hash'],
      );
      await pool.query(
        `INSERT INTO seller_profiles (user_id, display_name, legal_name, country_code, verification_status)
         VALUES ($1, 'Browser E2E Seller', 'Browser E2E Seller Legal', 'JP', 'verified')`,
        [ids.seller],
      );
      await pool.query(
        `INSERT INTO media_assets (id, owner_user_id, storage_key, original_filename, mime_type, byte_size, status)
         VALUES ($1, $2, $3, $4, 'video/mp4', $5, 'ready')`,
        [ids.media, ids.seller, mediaFilename, mediaFilename, fixture.length],
      );
      await pool.query(
        `INSERT INTO products (id, seller_id, media_asset_id, price_amount, price_currency, status)
         VALUES ($1, $2, $3, 1500, 'JPY', 'published')`,
        [ids.product, ids.seller, ids.media],
      );
      await pool.query(
        `INSERT INTO product_translations (product_id, locale, title, description)
         VALUES ($1, 'en', 'Browser E2E Product', 'Real backend browser acceptance product')`,
        [ids.product],
      );
      await pool.query('COMMIT');

      await page.goto(`${appUrl}#/register`);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('TestPassword!123');
      await page.getByRole('button', { name: /Register|Create account/i }).click();
      await expect(page).toHaveURL(/#\/browse/);

      const buyerResult = await pool.query(
        'SELECT id FROM users WHERE email_normalized = $1 LIMIT 1',
        [email.toLowerCase()],
      );
      expect(buyerResult.rows).toHaveLength(1);
      ids.buyer = buyerResult.rows[0].id;

      const sellerProductsResponse = await page.request.get(`${backendUrl}/api/seller/products`);
      expect(sellerProductsResponse.status()).toBe(403);
      const sellerOnlyRoutes = [
        '/api/seller/media/limits',
        '/api/seller/profile',
        '/api/seller/earnings',
        '/api/seller/payouts',
      ];
      for (const route of sellerOnlyRoutes) {
        const response = await page.request.get(`${backendUrl}${route}`);
        expect(response.status(), `buyer must be denied access to ${route}`).toBe(403);
      }

      await page.goto(`${appUrl}#/browse`);
      await expect(page.getByText('Browser E2E Product', { exact: true }).first()).toBeVisible();
      await page.getByText('Browser E2E Product', { exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`#/product/${ids.product}$`));
      await expect(page.getByRole('heading', { name: 'Browser E2E Product' })).toBeVisible();

      const orderResponsePromise = page.waitForResponse((response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST');
      await page.getByRole('button', { name: 'Purchase' }).click();
      const orderResponse = await orderResponsePromise;
      expect(orderResponse.status()).toBe(201);
      const orderBody = await orderResponse.json();
      expect(orderBody.order).toBeTruthy();
      expect(orderBody.order.product_id).toBe(ids.product);
      expect(orderBody.order.status).toBe('pending');
      orderId = orderBody.order.id;

      const checkoutResponse = await page.request.post(`${backendUrl}/api/orders/${orderId}/checkout`, {
        headers: { 'content-type': 'application/json' },
        data: {},
      });
      expect(checkoutResponse.status()).toBe(503);
      const checkoutBody = await checkoutResponse.json();
      expect(checkoutBody.error.code).toBe('PAYMENT_PROVIDER_REQUIRED');

      const ordersResponse = await page.request.get(`${backendUrl}/api/orders`);
      expect(ordersResponse.ok()).toBeTruthy();
      const ordersBody = await ordersResponse.json();
      const order = ordersBody.items.find((item) => item.orderId === orderId);
      expect(order).toBeTruthy();
      expect(order.productId).toBe(ids.product);
      expect(order.status).toBe('pending');

      providerPaymentId = `pay_${crypto.randomUUID()}`;
      eventId = `evt_${crypto.randomUUID()}`;
      const paymentResult = await pool.query(
        `INSERT INTO payments (order_id, user_id, provider, amount, currency, status, provider_payment_id, idempotency_key)
         VALUES ($1, $2, 'browser-test', 1500, 'JPY', 'pending', $3, $4)
         RETURNING id, provider`,
        [orderId, ids.buyer, providerPaymentId, `browser-test:${orderId}`],
      );
      expect(paymentResult.rows).toHaveLength(1);
      ids.payment = paymentResult.rows[0].id;
      expect(paymentResult.rows[0].provider).toBe('browser-test');

      const webhook = JSON.stringify({ eventId, provider: 'browser-test', eventType: 'payment_succeeded', paymentId: providerPaymentId, orderId, amount: 1500, currency: 'JPY', status: 'succeeded' });
      const paymentResponse = await page.request.post(`${backendUrl}/api/payments/webhook`, { headers: { 'content-type': 'application/json', 'x-payment-signature': signedPayload(webhook) }, data: webhook });
      expect(paymentResponse.ok()).toBeTruthy();

      await page.goto(`${appUrl}#/library`);
      await expect(page.getByRole('heading', { name: 'Browser E2E Product' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Watch' })).toHaveAttribute('href', `#/watch/${ids.product}`);
      await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', `/api/media/${ids.product}/download`);
      await expect(page.getByText('Ready to watch', { exact: true })).toBeVisible();

      await page.goto(`${appUrl}#/watch/${ids.product}`);
      const video = page.locator('video');
      await expect(video).toHaveAttribute('src', `/api/media/${ids.product}/stream`);
      await expect(page.getByText('Playback is protected by your active purchase entitlement.')).toBeVisible();

      const downloadResponse = await page.request.get(`${backendUrl}/api/media/${ids.product}/download`);
      expect(downloadResponse.status()).toBe(200);
      expect(Buffer.from(await downloadResponse.body())).toEqual(fixture);
    } finally {
      if (providerPaymentId) await pool.query(`DELETE FROM payment_events WHERE provider_payment_id = $1 OR order_id = $2`, [providerPaymentId, orderId]).catch(() => {});
      if (ids.payment) await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
      if (orderId) {
        await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [orderId]).catch(() => {});
        await pool.query(`DELETE FROM seller_earnings WHERE order_id = $1`, [orderId]).catch(() => {});
        await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
      }
      await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [ids.buyer]).catch(() => {});
      await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
      await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
      await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE id = $1`, [ids.seller]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE id = $1`, [ids.buyer]).catch(() => {});
      fs.rmSync(mediaPath, { force: true });
      await pool.end();
    }
  });

  test('seller account purchases another seller product through the real backend', async ({ page }) => {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const ids = {
      sellerBuyer: crypto.randomUUID(),
      productOwner: crypto.randomUUID(),
      media: crypto.randomUUID(),
      product: crypto.randomUUID(),
      order: null,
    };
    const email = `seller-buyer-${ids.sellerBuyer}@example.com`;
    const ownerEmail = `product-owner-${ids.productOwner}@example.com`;
    const mediaFilename = `${ids.media}.mp4`;
    const mediaPath = path.join(mediaDir, mediaFilename);
    const fixture = Buffer.from('browser-backend-seller-buyer-fixture');

    const adminEmail = `admin-${crypto.randomUUID()}@example.com`;

    try {
      fs.mkdirSync(mediaDir, { recursive: true });
      fs.writeFileSync(mediaPath, fixture);

      await pool.query('BEGIN');
      await pool.query(
        `INSERT INTO users (id, email, email_normalized, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'seller', 'active')`,
        [ids.productOwner, ownerEmail, ownerEmail.toLowerCase(), 'test-password-hash'],
      );
      await pool.query(
        `INSERT INTO seller_profiles (user_id, display_name, legal_name, country_code, verification_status)
         VALUES ($1, 'Product Owner', 'Product Owner Legal', 'JP', 'verified')`,
        [ids.productOwner],
      );
      await pool.query(
        `INSERT INTO media_assets (id, owner_user_id, storage_key, original_filename, mime_type, byte_size, status)
         VALUES ($1, $2, $3, $4, 'video/mp4', $5, 'ready')`,
        [ids.media, ids.productOwner, mediaFilename, mediaFilename, fixture.length],
      );
      await pool.query(
        `INSERT INTO products (id, seller_id, media_asset_id, price_amount, price_currency, status)
         VALUES ($1, $2, $3, 1500, 'JPY', 'published')`,
        [ids.product, ids.productOwner, ids.media],
      );
      await pool.query(
        `INSERT INTO product_translations (product_id, locale, title, description)
         VALUES ($1, 'en', 'Seller Buyer E2E Product', 'A product owned by another seller')`,
        [ids.product],
      );
      await pool.query('COMMIT');

      await page.goto('http://127.0.0.1:4173/pages/seller-register.html');
      await page.getByLabel('クリエイター名').fill('Approved Seller Buyer');
      await page.getByLabel('法的氏名').fill('Approved Seller Buyer Legal');
      await page.getByLabel('国/地域コード（2文字）').fill('JP');
      await page.getByLabel('メールアドレス').fill(email);
      await page.getByLabel('パスワード', { exact: true }).fill('TestPassword!123');
      await page.getByLabel('パスワード（確認）').fill('TestPassword!123');
      await page.getByLabel(/利用規約・プライバシーポリシーに同意する/).check();
      await page.getByRole('button', { name: '販売者アカウントを作成' }).click();
      await expect(page.locator('#seller-register-message')).toContainText('運営者の承認後');

      const registeredUser = await pool.query(
        'SELECT id, password_hash, role, status FROM users WHERE email_normalized = $1 LIMIT 1',
        [email.toLowerCase()],
      );
      expect(registeredUser.rows).toHaveLength(1);
      ids.sellerBuyer = registeredUser.rows[0].id;
      expect(registeredUser.rows[0]).toMatchObject({ role: 'seller', status: 'suspended' });

      await pool.query(
        `INSERT INTO users (email, email_normalized, password_hash, role, status)
         VALUES ($1, $1, $2, 'admin', 'active')`,
        [adminEmail, registeredUser.rows[0].password_hash],
      );

      await page.goto(`${appUrl}#/login`);
      await page.getByLabel('Email').fill(adminEmail);
      await page.getByLabel('Password').fill('TestPassword!123');
      await page.getByRole('button', { name: /Log in|Login|Sign in/i }).click();
      await expect(page).toHaveURL(/#\/browse/);
      await page.goto(`${appUrl}#/admin/seller-applications`);
      await expect(page.getByRole('heading', { name: /Seller applications/i })).toBeVisible();
      const applicationRow = page.locator('tbody tr').filter({ hasText: email }).first();
      await expect(applicationRow).toBeVisible();
      await applicationRow.locator('select[data-action]').selectOption('approve');
      await applicationRow.getByRole('button', { name: 'Apply' }).click();
      await expect.poll(async () => {
        const result = await pool.query('SELECT status FROM users WHERE id = $1', [ids.sellerBuyer]);
        return result.rows[0]?.status;
      }).toBe('active');

      await page.goto(`${appUrl}#/login`);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('TestPassword!123');
      await page.getByRole('button', { name: /Log in|Login|Sign in/i }).click();
      await expect(page).toHaveURL(/#\/browse/);
      const approvedSeller = await pool.query(
        'SELECT role, status FROM users WHERE id = $1 LIMIT 1',
        [ids.sellerBuyer],
      );
      expect(approvedSeller.rows[0]).toMatchObject({ role: 'seller', status: 'active' });

      await expect(page.getByText('Seller Buyer E2E Product', { exact: true }).first()).toBeVisible();
      await page.getByText('Seller Buyer E2E Product', { exact: true }).first().click();
      await expect(page).toHaveURL(new RegExp(`#/product/${ids.product}$`));

      const orderResponsePromise = page.waitForResponse(
        (response) => response.url().endsWith('/api/orders') && response.request().method() === 'POST',
      );
      await page.getByRole('button', { name: 'Purchase' }).click();
      const orderResponse = await orderResponsePromise;
      expect(orderResponse.status()).toBe(201);
      const body = await orderResponse.json();
      expect(body.order.product_id).toBe(ids.product);
      expect(body.order.status).toBe('pending');
      ids.order = body.order.id;

      const storedOrder = await pool.query(
        'SELECT buyer_id, product_id FROM orders WHERE id = $1 LIMIT 1',
        [ids.order],
      );
      expect(storedOrder.rows).toHaveLength(1);
      expect(storedOrder.rows[0].buyer_id).toBe(ids.sellerBuyer);
      expect(storedOrder.rows[0].product_id).toBe(ids.product);
    } finally {
      await pool.query('ROLLBACK').catch(() => {});
      await pool.query(
        'DELETE FROM entitlements WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = $1 AND product_id = $2)',
        [ids.sellerBuyer, ids.product],
      ).catch(() => {});
      await pool.query(
        'DELETE FROM seller_earnings WHERE order_id IN (SELECT id FROM orders WHERE buyer_id = $1 AND product_id = $2)',
        [ids.sellerBuyer, ids.product],
      ).catch(() => {});
      await pool.query(
        'DELETE FROM orders WHERE buyer_id = $1 AND product_id = $2',
        [ids.sellerBuyer, ids.product],
      ).catch(() => {});
      await pool.query('DELETE FROM user_sessions WHERE user_id = $1', [ids.sellerBuyer]).catch(() => {});
      await pool.query('DELETE FROM products WHERE id = $1', [ids.product]).catch(() => {});
      await pool.query('DELETE FROM media_assets WHERE id = $1', [ids.media]).catch(() => {});
      await pool.query('DELETE FROM seller_profiles WHERE user_id = $1', [ids.productOwner]).catch(() => {});
      await pool.query('DELETE FROM seller_profiles WHERE user_id = $1', [ids.sellerBuyer]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id = $1', [ids.productOwner]).catch(() => {});
      await pool.query('DELETE FROM users WHERE email_normalized = $1', [adminEmail.toLowerCase()]).catch(() => {});
      await pool.query('DELETE FROM users WHERE id = $1', [ids.sellerBuyer]).catch(() => {});
      fs.rmSync(mediaPath, { force: true });
      await pool.end();
    }
  });
});
