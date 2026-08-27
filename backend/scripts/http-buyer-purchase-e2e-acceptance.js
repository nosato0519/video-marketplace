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
const mediaBytes = Buffer.from('buyer-e2e-video-fixture');

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

function signedPayload(raw) {
  return crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET).update(raw).digest('hex');
}

const ids = {
  seller: crypto.randomUUID(),
  buyer: crypto.randomUUID(),
  media: crypto.randomUUID(),
  product: crypto.randomUUID(),
  order: null,
  payment: crypto.randomUUID(),
};
const sessionToken = createSessionToken();
const storageKey = `acceptance/${ids.media}.mp4`;
const providerPaymentId = `pay_${crypto.randomUUID()}`;
const eventId = `evt_${crypto.randomUUID()}`;

try {
  await fs.mkdir(`${mediaRoot}/acceptance`, { recursive: true });
  await fs.writeFile(`${mediaRoot}/${storageKey}`, mediaBytes);

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await pool.query(
    `INSERT INTO users (id, email, email_normalized, role, status)
     VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'buyer', 'active')`,
    [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`]
  );
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'E2E Seller')`, [ids.seller]);
  await pool.query(
    `INSERT INTO media_assets (id, owner_user_id, storage_key, mime_type, byte_size, status)
     VALUES ($1, $2, $3, 'video/mp4', $4, 'ready')`,
    [ids.media, ids.seller, storageKey, mediaBytes.length]
  );
  await pool.query(
    `INSERT INTO products
      (id, seller_id, media_asset_id, status, price_amount, price_currency, title, description,
       streaming_enabled, download_enabled, published_at)
     VALUES ($1, $2, $3, 'published', 1500, 'JPY', 'Buyer E2E Product', 'End-to-end acceptance product', TRUE, TRUE, NOW())`,
    [ids.product, ids.seller, ids.media]
  );
  await pool.query(
    `INSERT INTO user_sessions (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [ids.buyer, hashSessionToken(sessionToken), sessionExpiry()]
  );

  const cookie = `video_marketplace_session=${encodeURIComponent(sessionToken)}`;

  const orderResponse = await request(baseUrl, '/api/orders', {
    method: 'POST',
    headers: { 'content-type': 'application/json', cookie },
    body: JSON.stringify({ productId: ids.product }),
  });
  assert.equal(orderResponse.response.status, 201, JSON.stringify(orderResponse.body));
  assert.equal(orderResponse.body.order.product_id, ids.product);
  assert.equal(orderResponse.body.order.buyer_id, ids.buyer);
  assert.equal(orderResponse.body.order.status, 'pending');
  ids.order = orderResponse.body.order.id;

  await pool.query(
    `INSERT INTO payments
      (id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
     VALUES ($1, $2, $3, 'mock', $4, 1500, 'JPY', 'pending', $5)`,
    [ids.payment, ids.order, ids.buyer, providerPaymentId, `mock:${providerPaymentId}`]
  );

  const webhook = JSON.stringify({
    eventId,
    provider: 'mock',
    eventType: 'payment_succeeded',
    paymentId: providerPaymentId,
    orderId: ids.order,
    amount: 1500,
    currency: 'JPY',
    status: 'succeeded',
  });
  const paymentResponse = await request(baseUrl, '/api/payments/webhook', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': signedPayload(webhook) },
    body: webhook,
  });
  assert.equal(paymentResponse.response.status, 200, JSON.stringify(paymentResponse.body));

  const paidOrder = await pool.query(`SELECT status FROM orders WHERE id = $1`, [ids.order]);
  assert.equal(paidOrder.rows[0].status, 'paid');

  const libraryResponse = await request(baseUrl, '/api/library', { headers: { cookie } });
  assert.equal(libraryResponse.response.status, 200, JSON.stringify(libraryResponse.body));
  assert.equal(libraryResponse.body.items.length, 1);
  assert.equal(libraryResponse.body.items[0].product_id, ids.product);
  assert.equal(libraryResponse.body.items[0].entitlement_status, 'active');

  const downloadResponse = await request(baseUrl, `/api/media/${ids.product}/download`, { headers: { cookie } });
  assert.equal(downloadResponse.response.status, 200, `download failed: ${downloadResponse.body?.raw || downloadResponse.body}`);
  assert.equal(downloadResponse.response.headers.get('content-type'), 'video/mp4');
  assert.equal(downloadResponse.response.headers.get('cache-control'), 'private, no-store');
  assert.equal(Buffer.compare(downloadResponse.body, mediaBytes), 0);

  const nonBuyerToken = createSessionToken();
  const nonBuyer = crypto.randomUUID();
  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status) VALUES ($1, $2, $2, 'buyer', 'active')`, [nonBuyer, `nonbuyer-${nonBuyer}@acceptance.test`]);
  await pool.query(`INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`, [nonBuyer, hashSessionToken(nonBuyerToken), sessionExpiry()]);
  const denied = await request(baseUrl, `/api/media/${ids.product}/download`, {
    headers: { cookie: `video_marketplace_session=${encodeURIComponent(nonBuyerToken)}` },
  });
  assert.equal(denied.response.status, 404);
  assert.equal(denied.body.error.code, 'NOT_FOUND');

  console.log('http-buyer-purchase-e2e-acceptance: PASS');

  await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [nonBuyer]);
  await pool.query(`DELETE FROM users WHERE id = $1`, [nonBuyer]);
} finally {
  await pool.query(`DELETE FROM payment_events WHERE provider = 'mock' AND event_id = $1`, [eventId]).catch(() => {});
  if (ids.order) await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
  if (ids.order) await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  if (ids.order) await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [ids.buyer]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer]]).catch(() => {});
  await fs.rm(`${mediaRoot}/${storageKey}`, { force: true }).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
