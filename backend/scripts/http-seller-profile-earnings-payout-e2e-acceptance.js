import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createSessionToken, hashSessionToken, sessionExpiry } from '../src/auth/session.js';

const pool = getPool();
const server = createServer(createApp());
const sellerId = crypto.randomUUID();
const buyerId = crypto.randomUUID();
const productId = crypto.randomUUID();
const orderId = crypto.randomUUID();
const paymentId = crypto.randomUUID();
const entitlementId = crypto.randomUUID();
const sellerToken = createSessionToken();

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const cookie = `video_marketplace_session=${encodeURIComponent(sellerToken)}`;

  await pool.query(`INSERT INTO users (id,email,email_normalized,role,status) VALUES ($1,$2,$2,'seller','active'),($3,$4,$4,'buyer','active')`, [sellerId, `seller-${sellerId}@acceptance.test`, buyerId, `buyer-${buyerId}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id,display_name) VALUES ($1,'Seller Profile E2E')`, [sellerId]);
  await pool.query(`INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3)`, [sellerId, hashSessionToken(sellerToken), sessionExpiry()]);
  await pool.query(`INSERT INTO products (id,seller_id,status,price_amount,price_currency,title,description,streaming_enabled,download_enabled,published_at) VALUES ($1,$2,'published',5000,'JPY','E2E Product','Seller earnings fixture',TRUE,TRUE,NOW())`, [productId,sellerId]);
  await pool.query(`INSERT INTO orders (id,buyer_id,product_id,status,amount,currency) VALUES ($1,$2,$3,'paid',5000,'JPY')`, [orderId,buyerId,productId]);
  await pool.query(`INSERT INTO payments (id,order_id,user_id,provider,provider_payment_id,amount,currency,status,idempotency_key) VALUES ($1,$2,$3,'mock','seller-e2e-pay',5000,'JPY','succeeded','seller-e2e-pay')`, [paymentId,orderId,buyerId]);
  await pool.query(`INSERT INTO entitlements (id,user_id,product_id,order_id,status) VALUES ($1,$2,$3,$4,'active')`, [entitlementId,buyerId,productId,orderId]);

  const profile = await request(baseUrl, '/api/seller/profile', { headers: { cookie } });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.profile.display_name, 'Seller Profile E2E');

  const update = await request(baseUrl, '/api/seller/profile', { method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ display_name: 'Seller Profile Updated', bio: 'Reliable independent creator' }) });
  assert.equal(update.response.status, 200, JSON.stringify(update.body));
  assert.equal(update.body.profile.display_name, 'Seller Profile Updated');

  const verification = await request(baseUrl, '/api/seller/verification', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ legal_name: 'Acceptance Seller', country_code: 'JP' }) });
  assert.ok([200, 201, 409].includes(verification.response.status), JSON.stringify(verification.body));

  const earnings = await request(baseUrl, '/api/seller/earnings', { headers: { cookie } });
  assert.equal(earnings.response.status, 200, JSON.stringify(earnings.body));
  assert.ok(Number(earnings.body.summary.gross_amount) >= 5000);
  assert.ok(Number(earnings.body.summary.order_count) >= 1);

  const payouts = await request(baseUrl, '/api/seller/payouts', { headers: { cookie } });
  assert.equal(payouts.response.status, 200, JSON.stringify(payouts.body));
  assert.ok(Array.isArray(payouts.body.payouts));

  const payout = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 1000, currency: 'JPY' }) });
  assert.ok([201, 409].includes(payout.response.status), JSON.stringify(payout.body));
  if (payout.response.status === 201) assert.ok(payout.body.payout?.id);

  console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payouts WHERE seller_id = $1`, [sellerId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE id = $1`, [entitlementId]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [paymentId]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [productId]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id = $1`, [sellerId]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [sellerId]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id IN ($1,$2)`, [sellerId,buyerId]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
