import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';

process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'acceptance-only-payment-webhook-secret-0123456789abcdef';
process.env.PAYMENT_WEBHOOK_SECRET = secret;

const pool = getPool();
const server = createServer(createApp());

async function postWebhook(baseUrl, raw, signature) {
  const response = await fetch(`${baseUrl}/api/payments/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': signature },
    body: raw,
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { response, body };
}

const sign = (raw) => crypto.createHmac('sha256', secret).update(raw).digest('hex');
const ids = {
  seller: crypto.randomUUID(), buyer: crypto.randomUUID(), product: crypto.randomUUID(),
  order: crypto.randomUUID(), payment: crypto.randomUUID(),
};
const providerPaymentId = `pay_${crypto.randomUUID()}`;
const failedEventId = `evt_${crypto.randomUUID()}`;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status)
    VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'buyer', 'active')`,
    [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Failed Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO products (id, seller_id, status, price_amount, price_currency, streaming_enabled, download_enabled)
    VALUES ($1, $2, 'published', 1200, 'JPY', true, true)`, [ids.product, ids.seller]);
  await pool.query(`INSERT INTO orders (id, buyer_id, product_id, amount, currency, status)
    VALUES ($1, $2, $3, 1200, 'JPY', 'pending')`, [ids.order, ids.buyer, ids.product]);
  await pool.query(`INSERT INTO payments (id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
    VALUES ($1, $2, $3, 'mock', $4, 1200, 'JPY', 'pending', $5)`,
    [ids.payment, ids.order, ids.buyer, providerPaymentId, `mock:${providerPaymentId}`]);

  const failed = JSON.stringify({
    eventId: failedEventId, provider: 'mock', eventType: 'payment_failed',
    paymentId: providerPaymentId, orderId: ids.order, amount: 1200, currency: 'JPY', status: 'failed'
  });

  let result = await postWebhook(baseUrl, failed, sign(failed));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.received, true);
  assert.equal(result.body.result.duplicate, false);

  let state = await pool.query(`SELECT status FROM payments WHERE id = $1`, [ids.payment]);
  assert.equal(state.rows[0].status, 'failed');
  state = await pool.query(`SELECT status FROM orders WHERE id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'cancelled');

  state = await pool.query(`SELECT COUNT(*)::int AS count FROM entitlements WHERE order_id = $1`, [ids.order]);
  assert.equal(state.rows[0].count, 0);

  const eventRow = await pool.query(`SELECT status, event_type, provider_payment_id, processed_at
    FROM payment_events WHERE provider = 'mock' AND event_id = $1`, [failedEventId]);
  assert.equal(eventRow.rowCount, 1);
  assert.equal(eventRow.rows[0].status, 'processed');
  assert.equal(eventRow.rows[0].event_type, 'payment_failed');
  assert.equal(eventRow.rows[0].provider_payment_id, providerPaymentId);
  assert.notEqual(eventRow.rows[0].processed_at, null);

  result = await postWebhook(baseUrl, failed, sign(failed));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.duplicate, true);

  console.log('HTTP payment failed acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payment_events WHERE provider = 'mock' AND event_id = $1`, [failedEventId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer]]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
