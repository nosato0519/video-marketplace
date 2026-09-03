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
      translation: crypto.randomUUID(),
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
        `INSERT INTO product_translations (id, product_id, locale, title, description)
         VALUES ($1, $2, 'en', 'Browser E2E Product', 'Real backend browser acceptance product')`,
        [ids.translation, ids.product],
      );
      await pool.query('COMMIT');

      await page.goto(`${appUrl}#/register`);
      await page.getByLabel('Email').fill(email);
      await page.getByLabel('Password').fill('TestPassword!123');
      await page.getByRole('button', { name: /Register|Create account/i }).click();
      await expect(page).toHaveURL(/#\/browse/);
      await page.goto(`${appUrl}#/browse`);
      await expect(page.getByText('Browser E2E Product', { exact: true })).toBeVisible();
      await page.getByText('Browser E2E Product', { exact: true }).click();
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
      await expect(page.locator('#checkout-message')).toContainText(/Checkout|payment/i);

      const ordersResponse = await page.request.get(`${backendUrl}/api/orders`);
      expect(ordersResponse.ok()).toBeTruthy();
      const ordersBody = await ordersResponse.json();
      const order = ordersBody.items.find((item) => item.orderId === orderId);
      expect(order).toBeTruthy();
      expect(order.productId).toBe(ids.product);
      expect(order.status).toBe('pending');

      const paymentResult = await pool.query(`SELECT id, provider FROM payments WHERE order_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`, [orderId]);
      expect(paymentResult.rows).toHaveLength(1);
      ids.payment = paymentResult.rows[0].id;
      expect(paymentResult.rows[0].provider).toBeTruthy();
      providerPaymentId = `pay_${crypto.randomUUID()}`;
      eventId = `evt_${crypto.randomUUID()}`;
      await pool.query(`UPDATE payments SET provider_payment_id = $1 WHERE id = $2`, [providerPaymentId, ids.payment]);

      const webhook = JSON.stringify({ eventId, provider: paymentResult.rows[0].provider, eventType: 'payment_succeeded', paymentId: providerPaymentId, orderId, amount: 1500, currency: 'JPY', status: 'succeeded' });
      const paymentResponse = await page.request.post(`${backendUrl}/api/payments/webhook`, { headers: { 'content-type': 'application/json', 'x-payment-signature': signedPayload(webhook) }, data: webhook });
      expect(paymentResponse.ok()).toBeTruthy();

      await page.goto(`${appUrl}#/library`);
      await expect(page.getByRole('heading', { name: 'Browser E2E Product' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Watch' })).toHaveAttribute('href', `#/watch/${ids.product}`);
      await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', `/api/media/${ids.product}/download`);

      await page.goto(`${appUrl}#/watch/${ids.product}`);
      const video = page.locator('video');
      await expect(video).toHaveAttribute('src', `/api/media/${ids.product}/stream`);
      await expect(page.getByText('Playback is protected by your active entitlement.')).toBeVisible();

      const downloadResponse = await page.request.get(`${backendUrl}/api/media/${ids.product}/download`);
      expect(downloadResponse.status()).toBe(200);
      expect(Buffer.from(await downloadResponse.body())).toEqual(fixture);
    } finally {
      if (providerPaymentId) await pool.query(`DELETE FROM payment_events WHERE provider_payment_id = $1 OR order_id = $2`, [providerPaymentId, orderId]).catch(() => {});
      if (ids.payment) await pool.query(`DELETE FROM seller_earnings WHERE payment_id = $1`, [ids.payment]).catch(() => {});
      if (ids.payment) await pool.query(`DELETE FROM entitlements WHERE payment_id = $1`, [ids.payment]).catch(() => {});
      if (ids.payment) await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
      if (orderId) await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
      await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [ids.buyer]).catch(() => {});
      await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
      await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
      await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE id = $1`, [ids.seller]).catch(() => {});
      fs.rmSync(mediaPath, { force: true });
      await pool.end();
    }
  });
});
