import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import pg from '../backend/node_modules/pg/lib/index.js';

const { Pool } = pg;
const backendUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';
const appUrl = 'http://127.0.0.1:4173/app/index.html';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const mediaRoot = process.env.MEDIA_STORAGE_DIR || '/tmp/video-marketplace-media';
const mediaBytes = Buffer.from('buyer-browser-e2e-video-fixture');

function signedPayload(raw) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}

test.describe('real backend buyer purchase browser acceptance', () => {
  test('buyer registers, purchases, settles, and accesses protected media', async ({ page }) => {
    const ids = {
      seller: crypto.randomUUID(),
      media: crypto.randomUUID(),
      product: crypto.randomUUID(),
      payment: null,
    };
    const storageKey = `acceptance/${ids.media}.mp4`;
    const email = `buyer-${ids.product}@example.test`;
    let orderId = null;
    let providerPaymentId = null;
    let eventId = null;

    await fs.mkdir(`${mediaRoot}/acceptance`, { recursive: true });
    await fs.writeFile(`${mediaRoot}/${storageKey}`, mediaBytes);

    try {
      const health = await page.request.get(`${backendUrl}/api/health`);
      expect(health.ok()).toBeTruthy();

      await pool.query(
        `INSERT INTO users (id, email, email_normalized, role, status)
         VALUES ($1, $2, $2, 'seller', 'active')`,
        [ids.seller, `seller-${ids.product}@example.test`]
      );
      await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Browser E2E Seller')`, [ids.seller]);
      await pool.query(
        `INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
         VALUES ($1, $2, $3, 'video/mp4', $4, 'ready')`,
        [ids.media, ids.seller, storageKey, mediaBytes.length]
      );
      await pool.query(
        `INSERT INTO products
          (id, seller_id, media_asset_id, status, price_amount, price_currency, title, description,
           streaming_enabled, download_enabled, published_at)
         VALUES ($1, $2, $3, 'published', 1500, 'JPY', 'Browser E2E Product',
                 'Real backend buyer browser acceptance product', TRUE, TRUE, NOW())`,
        [ids.product, ids.seller, ids.media]
      );
      await pool.query(
        `INSERT INTO product_translations (product_id, locale, title, description)
         VALUES ($1, 'en', 'Browser E2E Product', 'Real backend buyer browser acceptance product')`,
        [ids.product]
      );

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

      const orderResponsePromise = page.waitForResponse((response) =>
        response.url() === `${backendUrl}/api/orders` && response.request().method() === 'POST'
      );
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
      const order = ordersBody.items.find((item) => item.id === orderId);
      expect(order).toBeTruthy();
      expect(order.product_id).toBe(ids.product);
      expect(order.status).toBe('pending');

      const paymentResult = await pool.query(
        `SELECT id, provider FROM payments WHERE order_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1`,
        [orderId]
      );
      expect(paymentResult.rows).toHaveLength(1);
      ids.payment = paymentResult.rows[0].id;
      expect(paymentResult.rows[0].provider).toBeTruthy();

      providerPaymentId = `pay_${crypto.randomUUID()}`;
      eventId = `evt_${crypto.randomUUID()}`;
      await pool.query(
        `UPDATE payments SET provider_payment_id = $1 WHERE id = $2`,
        [providerPaymentId, ids.payment]
      );

      const webhook = JSON.stringify({
        eventId,
        provider: paymentResult.rows[0].provider,
        eventType: 'payment_succeeded',
        paymentId: providerPaymentId,
        orderId,
        amount: 1500,
        currency: 'JPY',
        status: 'succeeded',
      });
      const paymentResponse = await page.request.post(`${backendUrl}/api/payments/webhook`, {
        headers: { 'content-type': 'application/json', 'x-payment-signature': signedPayload(webhook) },
        data: webhook,
      });
      expect(paymentResponse.ok()).toBeTruthy();

      await page.goto(`${appUrl}#/library`);
      await expect(page.getByRole('heading', { name: new RegExp(`${email}.*library`, 'i') })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Browser E2E Product' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Watch' })).toHaveAttribute('href', `#/watch/${ids.product}`);
      await expect(page.getByRole('link', { name: 'Download' })).toHaveAttribute('href', `/api/media/${ids.product}/download`);

      await page.goto(`${appUrl}#/watch/${ids.product}`);
      await expect(page.getByRole('heading', { name: 'Watch video' })).toBeVisible();
      await expect(page.locator('video.secure-player')).toHaveAttribute('src', `/api/media/${ids.product}/stream`);
      await expect(page.getByText('Playback is protected by your active entitlement.')).toBeVisible();

      const downloadResponse = await page.request.get(`${backendUrl}/api/media/${ids.product}/download`);
      expect(downloadResponse.status()).toBe(200);
      expect(await downloadResponse.body()).toEqual(mediaBytes);
    } finally {
      if (eventId) await pool.query(`DELETE FROM payment_events WHERE event_id = $1`, [eventId]).catch(() => {});
      if (orderId) await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [orderId]).catch(() => {});
      if (ids.payment) await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
      if (orderId) await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
      await pool.query(`DELETE FROM user_sessions WHERE user_id IN (SELECT id FROM users WHERE email = $1)`, [email]).catch(() => {});
      await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
      await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
      await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE id = $1`, [ids.seller]).catch(() => {});
      await pool.query(`DELETE FROM users WHERE email = $1`, [email]).catch(() => {});
      await fs.rm(`${mediaRoot}/${storageKey}`, { force: true }).catch(() => {});
    }
  });
});
