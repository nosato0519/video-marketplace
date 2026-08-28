import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createSessionToken, hashSessionToken, sessionExpiry } from '../src/auth/session.js';

process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'acceptance-only-payment-webhook-secret-0123456789abcdef';

const pool = getPool();
const server = createServer(createApp());
const mediaRoot = process.env.MEDIA_STORAGE_DIR;
const mediaBytes = Buffer.from('protected-media-e2e-fixture');
const ids = {
  seller: crypto.randomUUID(), buyer: crypto.randomUUID(), otherBuyer: crypto.randomUUID(),
  media: crypto.randomUUID(), product: crypto.randomUUID(), order: crypto.randomUUID(), payment: crypto.randomUUID(),
};
const buyerToken = createSessionToken();
const otherToken = createSessionToken();
const storageKey = `acceptance/${ids.media}.mp4`;
const providerPaymentId = `pay_${crypto.randomUUID()}`;
const successEventId = `evt_${crypto.randomUUID()}`;
const refundEventId = `evt_${crypto.randomUUID()}`;
const sign = (raw) => crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(raw).digest('hex');

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

async function webhook(baseUrl, payload) {
  const raw = JSON.stringify(payload);
  return request(baseUrl, '/api/payments/webhook', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-payment-signature': sign(raw) }, body: raw,
  });
}

try {
  await fs.mkdir(`${mediaRoot}/acceptance`, { recursive: true });
  await fs.writeFile(`${mediaRoot}/${storageKey}`, mediaBytes);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const buyerCookie = `video_marketplace_session=${encodeURIComponent(buyerToken)}`;
  const otherCookie = `video_marketplace_session=${encodeURIComponent(otherToken)}`;

  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status)
    VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'buyer', 'active'), ($5, $6, $6, 'buyer', 'active')`, [
    ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`, ids.otherBuyer, `other-${ids.otherBuyer}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Media E2E Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
    VALUES ($1, $2, $3, 'video/mp4', $4, 'ready')`, [ids.media, ids.seller, storageKey, mediaBytes.length]);
  await pool.query(`INSERT INTO products (id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, streaming_enabled, download_enabled, published_at)
    VALUES ($1, $2, $3, 'published', 1500, 'JPY', 'Media E2E Product', 'Protected media acceptance fixture', true, true, NOW())`, [ids.product, ids.seller, ids.media]);
  await pool.query(`INSERT INTO orders (id, buyer_id, product_id, amount, currency, status) VALUES ($1, $2, $3, 1500, 'JPY', 'pending')`, [ids.order, ids.buyer, ids.product]);
  await pool.query(`INSERT INTO payments (id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
    VALUES ($1, $2, $3, 'mock', $4, 1500, 'JPY', 'pending', $5)`, [ids.payment, ids.order, ids.buyer, providerPaymentId, `mock:${providerPaymentId}`]);
  await pool.query(`INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3), ($4, $5, $6)`, [ids.buyer, hashSessionToken(buyerToken), sessionExpiry(), ids.otherBuyer, hashSessionToken(otherToken), sessionExpiry()]);

  let result = await webhook(baseUrl, { eventId: successEventId, provider: 'mock', eventType: 'payment_succeeded', paymentId: providerPaymentId, orderId: ids.order, amount: 1500, currency: 'JPY', status: 'succeeded' });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  result = await request(baseUrl, `/api/media/${ids.product}/stream`, { headers: { cookie: buyerCookie } });
  assert.equal(result.response.status, 200, `stream: ${JSON.stringify(result.body)}`);
  assert.equal(result.response.headers.get('content-type'), 'video/mp4');
  assert.equal(Buffer.compare(result.body, mediaBytes), 0);

  result = await request(baseUrl, `/api/media/${ids.product}/download`, { headers: { cookie: buyerCookie } });
  assert.equal(result.response.status, 200, `download: ${JSON.stringify(result.body)}`);
  assert.equal(result.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(Buffer.compare(result.body, mediaBytes), 0);

  result = await request(baseUrl, `/api/media/${ids.product}/stream`, { headers: { cookie: otherCookie } });
  assert.equal(result.response.status, 404);
  result = await request(baseUrl, `/api/media/${ids.product}/download`, { headers: { cookie: otherCookie } });
  assert.equal(result.response.status, 404);

  result = await webhook(baseUrl, { eventId: refundEventId, provider: 'mock', eventType: 'payment_refunded', paymentId: providerPaymentId, orderId: ids.order });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  result = await request(baseUrl, `/api/media/${ids.product}/stream`, { headers: { cookie: buyerCookie } });
  assert.equal(result.response.status, 404);
  result = await request(baseUrl, `/api/media/${ids.product}/download`, { headers: { cookie: buyerCookie } });
  assert.equal(result.response.status, 404);

  result = await webhook(baseUrl, { eventId: refundEventId, provider: 'mock', eventType: 'payment_refunded', paymentId: providerPaymentId, orderId: ids.order });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.duplicate, true);

  console.log('http-media-access-e2e-acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payment_events WHERE provider = 'mock' AND event_id IN ($1, $2)`, [successEventId, refundEventId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])`, [[ids.buyer, ids.otherBuyer]]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer, ids.otherBuyer]]).catch(() => {});
  await fs.rm(`${mediaRoot}/${storageKey}`, { force: true }).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
