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
const adminId = crypto.randomUUID();
const productId = crypto.randomUUID();
const orderId = crypto.randomUUID();
const paymentId = crypto.randomUUID();
const entitlementId = crypto.randomUUID();
const earningId = crypto.randomUUID();
const sellerToken = createSessionToken();
const otherSellerToken = createSessionToken();
const adminToken = createSessionToken();

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
  const adminCookie = `video_marketplace_session=${encodeURIComponent(adminToken)}`;

  await pool.query(`INSERT INTO users (id,email,email_normalized,role,status) VALUES ($1,$2,$2,'seller','active'),($3,$4,$4,'buyer','active'),($5,$6,$6,'seller','active'),($7,$8,$8,'admin','active')`, [sellerId, `seller-${sellerId}@acceptance.test`, buyerId, `buyer-${buyerId}@acceptance.test`, otherSellerId, `other-seller-${otherSellerId}@acceptance.test`, adminId, `admin-${adminId}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id,display_name,legal_name,country_code) VALUES ($1,'Seller Profile E2E','Acceptance Seller','JP'),($2,'Other Seller E2E','Other Seller','JP')`, [sellerId, otherSellerId]);
  await pool.query(`INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3),($4,$5,$6),($7,$8,$9)`, [sellerId, hashSessionToken(sellerToken), sessionExpiry(), otherSellerId, hashSessionToken(otherSellerToken), sessionExpiry(), adminId, hashSessionToken(adminToken), sessionExpiry()]);
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
  const payoutId = payout.body.payout.id;

  const overdraw = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 4000, currency: 'JPY' }) });
  assert.equal(overdraw.response.status, 409, JSON.stringify(overdraw.body));
  assert.equal(overdraw.body.error, 'amount_exceeds_withdrawable_balance');

  // Concurrency acceptance: two simultaneous requests must not both pass the
  // balance/pending checks. With 4,500 JPY available and 1,000 JPY already
  // pending, two 2,500 JPY requests can only result in one success.
  const [concurrentA, concurrentB] = await Promise.all([
    request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 2500, currency: 'JPY' }) }),
    request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 2500, currency: 'JPY' }) })
  ]);
  const concurrentResults = [concurrentA, concurrentB];
  assert.equal(concurrentResults.filter((result) => result.response.status === 201).length, 1, JSON.stringify(concurrentResults.map((result) => ({ status: result.response.status, body: result.body }))));
  assert.equal(concurrentResults.filter((result) => result.response.status === 409).length, 1, JSON.stringify(concurrentResults.map((result) => ({ status: result.response.status, body: result.body }))));
  assert.equal(concurrentResults.find((result) => result.response.status === 409).body.error, 'amount_exceeds_withdrawable_balance');
  const concurrentPayoutId = concurrentResults.find((result) => result.response.status === 201).body.payout.id;
  assert.ok(concurrentPayoutId);

  const adminPayouts = await request(baseUrl, '/api/admin/payouts', { headers: { cookie: adminCookie } });
  assert.equal(adminPayouts.response.status, 200, JSON.stringify(adminPayouts.body));
  assert.equal(adminPayouts.body.payouts.some((item) => item.id === payoutId && item.seller_id === sellerId), true);
  assert.equal(adminPayouts.body.payouts.some((item) => item.id === concurrentPayoutId && item.amount === 2500 && item.seller_id === sellerId), true);

  for (const [from, to] of [['requested', 'reviewing'], ['reviewing', 'approved'], ['approved', 'processing'], ['processing', 'paid']]) {
    const transition = await request(baseUrl, `/api/admin/payouts/${payoutId}/status`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: to }) });
    assert.equal(transition.response.status, 200, JSON.stringify(transition.body));
    assert.equal(transition.body.payout.status, to);
    assert.equal(transition.body.payout.id, payoutId);
    assert.equal(transition.body.payout.seller_id, sellerId);
    assert.equal(transition.body.payout.amount, 1000);
    assert.equal(from === 'processing' ? Boolean(transition.body.payout.paid_at) : true, true);
  }

  const invalidTransition = await request(baseUrl, `/api/admin/payouts/${payoutId}/status`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
  assert.equal(invalidTransition.response.status, 409, JSON.stringify(invalidTransition.body));
  assert.equal(invalidTransition.body.error, 'invalid_status_transition');

  const audit = await request(baseUrl, `/api/admin/payouts/${payoutId}/audit`, { headers: { cookie: adminCookie } });
  assert.equal(audit.response.status, 200, JSON.stringify(audit.body));
  assert.ok(Array.isArray(audit.body.events));
  assert.equal(audit.body.events.filter((event) => event.resource_id === payoutId).length >= 4, true);

  const sellerPayoutsAfterAdmin = await request(baseUrl, '/api/seller/payouts', { headers: { cookie } });
  assert.equal(sellerPayoutsAfterAdmin.response.status, 200, JSON.stringify(sellerPayoutsAfterAdmin.body));
  const persistedPayout = sellerPayoutsAfterAdmin.body.payouts.find((item) => item.id === payoutId);
  assert.equal(persistedPayout.status, 'paid');
  assert.ok(persistedPayout.paid_at);

  console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM audit_events WHERE resource_type = 'payout' AND resource_id IN (SELECT id FROM payouts WHERE seller_id IN ($1,$2))`, [sellerId, otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM payouts WHERE seller_id IN ($1,$2)`, [sellerId, otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM seller_earnings WHERE id = $1`, [earningId]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE id = $1`, [entitlementId]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [paymentId]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [orderId]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [productId]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id IN ($1,$2,$3)`, [sellerId,otherSellerId,adminId]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id IN ($1,$2)`, [sellerId,otherSellerId]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id IN ($1,$2,$3,$4)`, [sellerId,buyerId,otherSellerId,adminId]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}