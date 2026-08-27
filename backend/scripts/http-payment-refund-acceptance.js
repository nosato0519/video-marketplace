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
const successEventId = `evt_${crypto.randomUUID()}`;
const refundEventId = `evt_${crypto.randomUUID()}`;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status)
    VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'buyer', 'active')`,
    [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Refund Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO products (id, seller_id, status, price_amount, price_currency, streaming_enabled, download_enabled)
    VALUES ($1, $2, 'published', 1500, 'JPY', true, true)`, [ids.product, ids.seller]);
  await pool.query(`INSERT INTO orders (id, buyer_id, product_id, amount, currency, status)
    VALUES ($1, $2, $3, 1500, 'JPY', 'pending')`, [ids.order, ids.buyer, ids.product]);
  await pool.query(`INSERT INTO payments (id, order_id, user_id, provider, provider_payment_id, amount, currency, status, idempotency_key)
    VALUES ($1, $2, $3, 'mock', $4, 1500, 'JPY', 'pending', $5)`,
    [ids.payment, ids.order, ids.buyer, providerPaymentId, `mock:${providerPaymentId}`]);

  const success = JSON.stringify({
    eventId: successEventId, provider: 'mock', eventType: 'payment_succeeded',
    paymentId: providerPaymentId, orderId: ids.order, amount: 1500, currency: 'JPY', status: 'succeeded'
  });
  let result = await postWebhook(baseUrl, success, sign(success));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  let state = await pool.query(`SELECT status FROM orders WHERE id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'paid');
  state = await pool.query(`SELECT status FROM entitlements WHERE order_id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'active');

  const refund = JSON.stringify({
    eventId: refundEventId, provider: 'mock', eventType: 'payment_refunded',
    paymentId: providerPaymentId, orderId: ids.order
  });
  result = await postWebhook(baseUrl, refund, sign(refund));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  state = await pool.query(`SELECT status, refunded_at FROM orders WHERE id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'refunded');
  assert.notEqual(state.rows[0].refunded_at, null);
  state = await pool.query(`SELECT status, revoked_at FROM entitlements WHERE order_id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'revoked');
  assert.notEqual(state.rows[0].revoked_at, null);

  result = await postWebhook(baseUrl, refund, sign(refund));
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.result?.duplicate, true);

  const eventRow = await pool.query(`SELECT status, event_type, provider_payment_id FROM payment_events
    WHERE provider = 'mock' AND event_id = $1`, [refundEventId]);
  assert.equal(eventRow.rowCount, 1);
  assert.equal(eventRow.rows[0].status, 'processed');
  assert.equal(eventRow.rows[0].event_type, 'payment_refunded');
  assert.equal(eventRow.rows[0].provider_payment_id, providerPaymentId);

  console.log('HTTP payment refund acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payment_events WHERE provider = 'mock' AND event_id IN ($1, $2)`, [successEventId, refundEventId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer]]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}