import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createSessionToken, hashSessionToken, sessionExpiry } from '../src/auth/session.js';

const pool = getPool();
const server = createServer(createApp());
const ids = { seller: crypto.randomUUID(), buyer: crypto.randomUUID(), otherBuyer: crypto.randomUUID(), product: crypto.randomUUID(), order: crypto.randomUUID(), payment: crypto.randomUUID(), entitlement: crypto.randomUUID() };
const buyerToken = createSessionToken();
const otherBuyerToken = createSessionToken();

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

try {
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const buyerCookie = `video_marketplace_session=${encodeURIComponent(buyerToken)}`;
  const otherBuyerCookie = `video_marketplace_session=${encodeURIComponent(otherBuyerToken)}`;

  await pool.query(`INSERT INTO users (id,email,email_normalized,role,status) VALUES ($1,$2,$2,'seller','active'),($3,$4,$4,'buyer','active'),($5,$6,$6,'buyer','active')`, [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`, ids.otherBuyer, `other-${ids.otherBuyer}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id,display_name) VALUES ($1,'Report E2E Seller')`, [ids.seller]);
  await pool.query(`INSERT INTO products (id,seller_id,status,price_amount,price_currency,title,description,streaming_enabled,download_enabled,published_at) VALUES ($1,$2,'published',1800,'JPY','Report E2E Product','Reportable product',TRUE,TRUE,NOW())`, [ids.product,ids.seller]);
  await pool.query(`INSERT INTO user_sessions (user_id,token_hash,expires_at) VALUES ($1,$2,$3),($4,$5,$6)`, [ids.buyer,hashSessionToken(buyerToken),sessionExpiry(),ids.otherBuyer,hashSessionToken(otherBuyerToken),sessionExpiry()]);
  await pool.query(`INSERT INTO orders (id,buyer_id,product_id,status,amount,currency) VALUES ($1,$2,$3,'paid',1800,'JPY')`, [ids.order,ids.buyer,ids.product]);
  await pool.query(`INSERT INTO payments (id,order_id,user_id,provider,provider_payment_id,amount,currency,status,idempotency_key) VALUES ($1,$2,$3,'mock','report-pay',1800,'JPY','succeeded','report-pay')`, [ids.payment,ids.order,ids.buyer]);
  await pool.query(`INSERT INTO entitlements (id,user_id,product_id,order_id,status) VALUES ($1,$2,$3,$4,'active')`, [ids.entitlement,ids.buyer,ids.product,ids.order]);

  const history = await request(baseUrl, '/api/orders', { headers: { cookie: buyerCookie } });
  assert.equal(history.response.status, 200, JSON.stringify(history.body));
  const item = history.body.items.find((row) => row.id === ids.order);
  assert.ok(item, 'buyer order history should include own order');
  assert.equal(item.product_id, ids.product);
  assert.equal(item.status, 'paid');

  const otherHistory = await request(baseUrl, '/api/orders', { headers: { cookie: otherBuyerCookie } });
  assert.equal(otherHistory.response.status, 200, JSON.stringify(otherHistory.body));
  assert.equal(otherHistory.body.items.some((row) => row.id === ids.order), false);

  const report = await request(baseUrl, `/api/products/${ids.product}/reports`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: buyerCookie }, body: JSON.stringify({ reason_code: 'copyright', description: 'I believe this content uses copyrighted material without permission.' }) });
  assert.equal(report.response.status, 201, JSON.stringify(report.body));
  assert.equal(report.body.report.product_id, ids.product);
  assert.equal(report.body.report.status, 'open');

  const duplicate = await request(baseUrl, `/api/products/${ids.product}/reports`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: buyerCookie }, body: JSON.stringify({ reason_code: 'copyright', description: 'A second report should be rejected while the first is open.' }) });
  assert.equal(duplicate.response.status, 409, JSON.stringify(duplicate.body));
  assert.equal(duplicate.body.error, 'report_already_open');

  const otherReport = await request(baseUrl, `/api/products/${ids.product}/reports`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: otherBuyerCookie }, body: JSON.stringify({ reason_code: 'other', description: 'Another buyer can submit an independent report.' }) });
  assert.equal(otherReport.response.status, 201, JSON.stringify(otherReport.body));

  console.log('http-buyer-order-report-e2e-acceptance: PASS');
} finally {
  await pool.query(`DELETE FROM content_reports WHERE product_id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM entitlements WHERE id = $1`, [ids.entitlement]).catch(() => {});
  await pool.query(`DELETE FROM payments WHERE id = $1`, [ids.payment]).catch(() => {});
  await pool.query(`DELETE FROM orders WHERE id = $1`, [ids.order]).catch(() => {});
  await pool.query(`DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])`, [[ids.buyer, ids.otherBuyer]]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = $1`, [ids.seller]).catch(() => {});
  await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.buyer, ids.otherBuyer, ids.seller]]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
