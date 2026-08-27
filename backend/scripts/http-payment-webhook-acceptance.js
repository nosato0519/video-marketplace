import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { query, closePool } from '../src/db.js';

const port = Number(process.env.PORT || 4187);
const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'acceptance-webhook-secret';
const base = `http://127.0.0.1:${port}`;
const serverProcess = spawn(process.execPath, ['src/server.js'], {
  cwd: new URL('..', import.meta.url).pathname,
  env: { ...process.env, PORT: String(port), PAYMENT_WEBHOOK_SECRET: secret, NODE_ENV: 'test' },
  stdio: ['ignore', 'pipe', 'pipe']
});

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function request(path, options = {}) {
  const response = await fetch(`${base}${path}`, options);
  const text = await response.text();
  let body = null;
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  return { response, body };
}
function signature(raw) {
  return crypto.createHmac('sha256', secret).update(raw).digest('hex');
}
async function postEvent(event, sig = signature(event.raw)) {
  return request('/api/payments/webhooks/mock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': sig },
    body: event.raw
  });
}

let buyerId, sellerId, productId, orderId, paymentId;
try {
  await wait(1200);
  const users = await query(`
    INSERT INTO users (id, email, password_hash, role, status)
    VALUES (gen_random_uuid(), $1, 'acceptance', 'buyer', 'active'),
           (gen_random_uuid(), $2, 'acceptance', 'seller', 'active')
    RETURNING id, email`, [`buyer-${crypto.randomUUID()}@example.test`, `seller-${crypto.randomUUID()}@example.test`]);
  buyerId = users.rows.find((u) => u.email.startsWith('buyer-')).id;
  sellerId = users.rows.find((u) => u.email.startsWith('seller-')).id;

  await query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Webhook Seller')`, [sellerId]);
  productId = (await query(`
    INSERT INTO products (id, seller_id, status, price_amount, price_currency, streaming_enabled, download_enabled)
    VALUES (gen_random_uuid(), $1, 'published', 1500, 'JPY', true, true) RETURNING id`, [sellerId])).rows[0].id;
  orderId = (await query(`
    INSERT INTO orders (id, buyer_id, seller_id, product_id, amount, currency, status)
    VALUES (gen_random_uuid(), $1, $2, $3, 1500, 'JPY', 'pending') RETURNING id`, [buyerId, sellerId, productId])).rows[0].id;
  paymentId = (await query(`
    INSERT INTO payments (id, order_id, provider, status, amount, currency)
    VALUES (gen_random_uuid(), $1, 'mock', 'pending', 1500, 'JPY') RETURNING id`, [orderId])).rows[0].id;

  const event = {
    id: `evt_${crypto.randomUUID()}`,
    type: 'payment_succeeded',
    provider: 'mock',
    payment_id: paymentId,
    order_id: orderId,
    amount: 1500,
    currency: 'JPY',
    raw: ''
  };
  event.raw = JSON.stringify({ ...event, raw: undefined });

  let result = await postEvent(event);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));

  let state = await query(`SELECT status FROM orders WHERE id = $1`, [orderId]);
  assert.equal(state.rows[0].status, 'paid');
  state = await query(`SELECT status FROM payments WHERE id = $1`, [paymentId]);
  assert.equal(state.rows[0].status, 'succeeded');
  state = await query(`SELECT count(*)::int AS count FROM entitlements WHERE order_id = $1`, [orderId]);
  assert.equal(state.rows[0].count, 1);

  result = await postEvent(event);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  state = await query(`SELECT count(*)::int AS count FROM entitlements WHERE order_id = $1`, [orderId]);
  assert.equal(state.rows[0].count, 1);

  result = await postEvent(event, 'bad-signature');
  assert.equal(result.response.status, 401);

  const tampered = JSON.stringify({ ...JSON.parse(event.raw), amount: 9999 });
  result = await request('/api/payments/webhooks/mock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': signature(tampered) },
    body: tampered
  });
  assert.ok([400, 409].includes(result.response.status), JSON.stringify(result.body));

  console.log('HTTP payment webhook acceptance: PASS');
} finally {
  try {
    if (orderId) await query(`DELETE FROM entitlements WHERE order_id = $1`, [orderId]);
    if (paymentId) await query(`DELETE FROM payment_events WHERE payment_id = $1`, [paymentId]);
    if (paymentId) await query(`DELETE FROM payments WHERE id = $1`, [paymentId]);
    if (orderId) await query(`DELETE FROM orders WHERE id = $1`, [orderId]);
    if (productId) await query(`DELETE FROM products WHERE id = $1`, [productId]);
    if (sellerId) await query(`DELETE FROM seller_profiles WHERE user_id = $1`, [sellerId]);
    if (buyerId) await query(`DELETE FROM users WHERE id = $1`, [buyerId]);
  } catch (error) { console.error('cleanup failed', error); }
  serverProcess.kill('SIGTERM');
  await closePool();
}
