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
const otherSellerId = crypto.randomUUID();
const productId = crypto.randomUUID();
const orderId = crypto.randomUUID();
const paymentId = crypto.randomUUID();
const entitlementId = crypto.randomUUID();
const earningId = crypto.randomUUID();
const sellerToken = createSessionToken();
const otherSellerToken = createSessionToken();

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
  const otherCookie = `video_marketplace_session=${encodeURIComponent(otherSellerToken)}`;

  await pool.query(`INSERT INTO users (id,email,email_normalized,role,status) VALUES ($1,$2,$2,'seller','active'),($3,$4,$4,'buyer','active'),($5,$6,$6,'seller','active')`, [sellerId, `seller-${sellerId}@acceptance.test`, buyerId, `buyer-${buyerId}@acceptance.test`, otherSellerId, `other-seller-${otherSellerId}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id,display_name,legal_name,country_code) VALUES ($1,'Seller Profile E2E','Acceptance Seller','JP'),($2,'Other Seller E2E','Other Seller','JP')`, [sellerId, otherSellerId]);
  await pool.query(`INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3),($4,$5,$6)`, [sellerId, hashSessionToken(sellerToken), sessionExpiry(), otherSellerId, hashSessionToken(otherSellerToken), sessionExpiry()]);
  await pool.query(`INSERT INTO products (id,seller_id,status,price_amount,price_currency,title,description,streaming_enabled,download_enabled,published_at) VALUES ($1,$2,'published',5000,'JPY','E2E Product','Seller earnings fixture',TRUE,TRUE,NOW())`, [productId,sellerId]);
  await pool.query(`INSERT INTO orders (id,buyer_id,product_id,status,amount,currency) VALUES ($1,$2,$3,'paid',5000,'JPY')`, [orderId,buyerId,productId]);
  await pool.query(`INSERT INTO payments (id,order_id,user_id,provider,provider_payment_id,amount,currency,status,idempotency_key) VALUES ($1,$2,$3,'mock','seller-e2e-pay',5000,'JPY','succeeded','seller-e2e-pay')`, [paymentId,orderId,buyerId]);
  await pool.query(`INSERT INTO entitlements (id,user_id,product_id,order_id,status) VALUES ($1,$2,$3,$4,'active')`, [entitlementId,buyerId,productId,orderId]);
  await pool.query(`INSERT INTO seller_earnings (id,seller_id,order_id,product_id,gross_amount,platform_fee,net_amount,currency,status) VALUES ($1,$2,$3,$4,5000,500,4500,'JPY','available')`, [earningId,sellerId,orderId,productId]);

  const profile = await request(baseUrl, '/api/seller/profile', { headers: { cookie } });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.profile.display_name, 'Seller Profile E2E');
  assert.equal(profile.body.profile.legal_name, 'Acceptance Seller');

  const update = await request(baseUrl, '/api/seller/profile', { method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Seller Profile Updated', legalName: 'Acceptance Seller Updated', countryCode: 'JP' }) });
  assert.equal(update.response.status, 200, JSON.stringify(update.body));
  assert.equal(update.body.profile.display_name, 'Seller Profile Updated');
  assert.equal(update.body.profile.legal_name, 'Acceptance Seller Updated');

  const verification = await request(baseUrl, '/api/seller/profile/submit-verification', { method: 'POST', headers: { cookie } });
  assert.equal(verification.response.status, 200, JSON.stringify(verification.body));
  assert.equal(verification.body.profile.verification_status, 'submitted');

  const duplicateVerification = await request(baseUrl, '/api/seller/profile/submit-verification', { method: 'POST', headers: { cookie } });
  assert.equal(duplicateVerification.response.status, 409, JSON.stringify(duplicateVerification.body));
  assert.equal(duplicateVerification.body.error, 'verification_already_submitted');

  const earnings = await request(baseUrl, '/api/seller/earnings', { headers: { cookie } });
  assert.equal(earnings.response.status, 200, JSON.stringify(earnings.body));
  assert.equal(Number(earnings.body.summary.earned_amount), 4500);
  assert.equal(Number(earnings.body.summary.available_amount), 4500);
  assert.equal(Number(earnings.body.summary.sale_count), 1);
  assert.equal(earnings.body.earnings.some((earning) => earning.id === earningId), true);

  const otherEarnings = await request(baseUrl, '/api/seller/earnings', { headers: { cookie: otherCookie } });
  assert.equal(otherEarnings.response.status, 200, JSON.stringify(otherEarnings.body));
  assert.equal(Number(otherEarnings.body.summary.earned_amount), 0);
  assert.equal(otherEarnings.body.earnings.some((earning) => earning.id === earningId), false);

  const payouts = await request(baseUrl, '/api/seller/payouts', { headers: { cookie } });
  assert.equal(payouts.response.status, 200, JSON.stringify(payouts.body));
  assert.ok(Array.isArray(payouts.body.payouts));

  const payout = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 1000, currency: 'JPY' }) });
  assert.equal(payout.response.status, 201, JSON.stringify(payout.body));
  assert.ok(payout.body.payout?.id);
  assert.equal(payout.body.payout.status, 'requested');

  const overdraw = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 4000, currency: 'JPY' }) });
  assert.equal(overdraw.response.status, 409, JSON.stringify(overdraw.body));
  assert.equal(overdraw.body.error, 'amount_exceeds_withdrawable_balance');

  console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM payouts WHERE seller_id IN ($1,$2)`, [sellerId, otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM seller_earnings WHERE id = $1`, [earningId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE id = $1`, [entitlementId]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [paymentId]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [productId]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id IN ($1,$2)`, [sellerId,otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id IN ($1,$2)`, [sellerId,otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id IN ($1,$2,$3)`, [sellerId,buyerId,otherSellerId]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
