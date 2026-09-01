import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';

process.env.DATABASE_URL ||= 'postgresql://postgres:postgres@127.0.0.1:5432/video_marketplace';
process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'acceptance-only-payment-webhook-secret-0123456789abcdef';

const { getPool } = await import('../backend/src/db.js');
const { createSessionToken, hashSessionToken, sessionExpiry } = await import('../backend/src/auth/session.js');

const pool = getPool();
const mediaBytes = Buffer.from('browser-buyer-real-backend-video-fixture');
const mediaRoot = process.env.MEDIA_STORAGE_DIR;
const ids = { seller: crypto.randomUUID(), buyer: crypto.randomUUID(), media: crypto.randomUUID(), product: crypto.randomUUID() };
const buyerEmail = `browser-buyer-${ids.buyer}@acceptance.test`;
const buyerToken = createSessionToken();
const storageKey = `acceptance/${ids.media}.mp4`;
const providerPaymentId = `pay_${crypto.randomUUID()}`;
const eventId = `evt_${crypto.randomUUID()}`;

async function seed() {
  await fs.mkdir(`${mediaRoot}/acceptance`, { recursive: true });
  await fs.writeFile(`${mediaRoot}/${storageKey}`, mediaBytes);
  await pool.query(`INSERT INTO users (id,email,email_normalized,role,status) VALUES ($1,$2,$2,'seller','active'),($3,$4,$4,'buyer','active')`, [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, buyerEmail]);
  await pool.query(`INSERT INTO seller_profiles (user_id,display_name) VALUES ($1,'Browser E2E Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO media_assets (id,owner_user_id,storage_key,mime_type,byte_size,status) VALUES ($1,$2,$3,'video/mp4',$4,'ready')`, [ids.media,ids.seller,storageKey,mediaBytes.length]);
  await pool.query(`INSERT INTO products (id,seller_id,media_asset_id,status,price_amount,price_currency,title,description,streaming_enabled,download_enabled,published_at) VALUES ($1,$2,$3,'published',1500,'JPY','Browser E2E Product','Real backend browser acceptance product',TRUE,TRUE,NOW())`, [ids.product,ids.seller,ids.media]);
  await pool.query(`INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3)`, [ids.buyer,hashSessionToken(buyerToken),sessionExpiry()]);
}

async function settle(orderId) {
  await pool.query(`INSERT INTO payments (id,order_id,user_id,provider,provider_payment_id,amount,currency,status,idempotency_key) VALUES ($1,$2,$3,'mock',$4,1500,'JPY','pending',$5)`, [crypto.randomUUID(),orderId,ids.buyer,providerPaymentId,`mock:${providerPaymentId}`]);
  const payload = JSON.stringify({ eventId, provider:'mock', eventType:'payment_succeeded', paymentId:providerPaymentId, orderId, amount:1500, currency:'JPY', status:'succeeded' });
  const signature = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(payload).digest('hex');
  const response = await fetch('http://127.0.0.1:3000/api/payments/webhook', { method:'POST', headers:{'content-type':'application/json','x-payment-signature':signature}, body:payload });
  expect(response.status).toBe(200);
}

test.describe('buyer real-backend browser acceptance', () => {
  test.beforeAll(seed);
  test.afterAll(async () => {
    await pool.query(`DELETE FROM payment_events WHERE provider='mock' AND event_id=$1`, [eventId]).catch(()=>{});
    await pool.query(`DELETE FROM user_sessions WHERE user_id=$1`, [ids.buyer]).catch(()=>{});
    await pool.query(`DELETE FROM entitlements WHERE user_id=$1`, [ids.buyer]).catch(()=>{});
    await pool.query(`DELETE FROM seller_earnings WHERE order_id IN (SELECT id FROM orders WHERE buyer_id=$1)`, [ids.buyer]).catch(()=>{});
    await pool.query(`DELETE FROM payments WHERE provider_payment_id=$1`, [providerPaymentId]).catch(()=>{});
    await pool.query(`DELETE FROM orders WHERE buyer_id=$1`, [ids.buyer]).catch(()=>{});
    await pool.query(`DELETE FROM products WHERE id=$1`, [ids.product]).catch(()=>{});
    await pool.query(`DELETE FROM media_assets WHERE id=$1`, [ids.media]).catch(()=>{});
    await pool.query(`DELETE FROM seller_profiles WHERE user_id=$1`, [ids.seller]).catch(()=>{});
    await pool.query(`DELETE FROM users WHERE id=ANY($1::uuid[])`, [[ids.seller,ids.buyer]]).catch(()=>{});
    await fs.rm(`${mediaRoot}/${storageKey}`, {force:true}).catch(()=>{});
    await pool.end();
  });

  test('browse, open real product, create real order, settle it, and access Library', async ({ page, context }) => {
    await context.addCookies([{ name:'video_marketplace_session', value:buyerToken, domain:'127.0.0.1', path:'/' }]);
    await page.goto('/browse');
    const card = page.locator(`[data-product-id="${ids.product}"]`);
    await expect(card).toBeVisible();
    await card.click();
    await expect(page.getByRole('heading',{name:'Browser E2E Product'})).toBeVisible();
    const orderResponse = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method()==='POST');
    await page.getByRole('button',{name:'Purchase'}).click();
    const response = await orderResponse;
    expect(response.status()).toBe(201);
    const order = await response.json();
    await settle(order.order.id);
    await page.goto('/library');
    await expect(page.getByRole('heading',{name:new RegExp(`${buyerEmail}.*library`,'i')})).toBeVisible();
    await expect(page.getByRole('heading',{name:'Browser E2E Product'})).toBeVisible();
    await expect(page.getByRole('link',{name:'Watch'})).toHaveAttribute('href',`#/watch/${ids.product}`);
    await expect(page.getByRole('link',{name:'Download'})).toHaveAttribute('href',`/api/media/${ids.product}/download`);
  });

  test('real entitlement protects watch and download', async ({ page, context }) => {
    await context.addCookies([{ name:'video_marketplace_session', value:buyerToken, domain:'127.0.0.1', path:'/' }]);
    await page.goto(`/watch/${ids.product}`);
    await expect(page.getByRole('heading',{name:'Watch video'})).toBeVisible();
    await expect(page.locator('video.secure-player')).toHaveAttribute('src',`/api/media/${ids.product}/stream`);
    const download = await page.request.get(`/api/media/${ids.product}/download`, { headers:{ cookie:`video_marketplace_session=${encodeURIComponent(buyerToken)}` } });
    expect(download.status()).toBe(200);
    expect(download.headers()['content-type']).toBe('video/mp4');
    expect(Buffer.compare(Buffer.from(await download.body()), mediaBytes)).toBe(0);
  });
});
