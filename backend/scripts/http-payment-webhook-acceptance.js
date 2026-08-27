import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { getPool } from '../src/db.js';

const port = Number(process.env.PORT || 4187);
const secret = process.env.PAYMENT_WEBHOOK_SECRET || 'acceptance-webhook-secret';
const base = `http://127.0.0.1:${port}`;
const pool = getPool();
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
async function postEvent(raw, sig = signature(raw)) {
  return request('/api/payments/webhooks/mock', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment-signature': sig },
    body: raw
  });
}

const ids = {
  seller: crypto.randomUUID(), buyer: crypto.randomUUID(), product: crypto.randomUUID(),
  order: crypto.randomUUID(), payment: crypto.randomUUID()
};

try {
  await wait(1200);
  const sellerEmail = `seller-${ids.seller}@acceptance.test`;
  const buyerEmail = `buyer-${ids.buyer}@acceptance.test`;
  await pool.query(`
    INSERT INTO users (id, email, email_normalized, role, status)
    VALUES ($1, $2, $3, 'seller', 'active'), ($4, $5, $6, 'buyer', 'active')`,
    [ids.seller, sellerEmail, sellerEmail.toLowerCase(), ids.buyer, buyerEmail, buyerEmail.toLowerCase()]
  );
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Webhook Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO products (id, seller_id, status, price_amount, price_currency, streaming_enabled, download_enabled)
    VALUES ($1, $2, 'published', 1500, 'JPY', true, true)`, [ids.product, ids.seller]);
  await pool.query(`INSERT INTO orders (id, buyer_id, product_id, amount, currency, status)
    VALUES ($1, $2, $3, 1500, 'JPY', 'pending')`, [ids.order, ids.buyer, ids.product]);
  await pool.query(`INSERT INTO payments (id, order_id, provider, status, amount, currency)
    VALUES ($1, $2, 'mock', 'pending', 1500, 'JPY')`, [ids.payment, ids.order]);

  const event = JSON.stringify({ id: `evt_${crypto.randomUUID()}`, type: 'payment_succeeded', provider: 'mock',
    payment_id: ids.payment, order_id: ids.order, amount: 1500, currency: 'JPY' });

  let result = await postEvent(event);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  let state = await pool.query(`SELECT status FROM orders WHERE id = $1`, [ids.order]);
  assert.equal(state.rows[0].status, 'paid');
  state = await pool.query(`SELECT status FROM payments WHERE id = $1`, [ids.payment]);
  assert.equal(state.rows[0].status, 'succeeded');
  state = await pool.query(`SELECT count(*)::int AS count FROM entitlements WHERE order_id = $1`, [ids.order]);
  assert.equal(state.rows[0].count, 1);

  result = await postEvent(event);
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  state = await pool.query(`SELECT count(*)::int AS count FROM entitlements WHERE order_id = $1`, [ids.order]);
  assert.equal(state.rows[0].count, 1);

  result = await postEvent(event, 'bad-signature');
  assert.equal(result.response.status, 401);

  const tampered = JSON.stringify({ ...JSON.parse(event), amount: 9999 });
  result = await postEvent(tampered);
  assert.ok([400, 409].includes(result.response.status), JSON.stringify(result.body));

  console.log('HTTP payment webhook acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payment_events WHERE payment_id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE order_id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.buyer]]).catch(() => {});
  serverProcess.kill('SIGTERM');
  await pool.end();
}
