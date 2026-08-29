import assert from 'node:assert/strict';
import { query } from '../src/db.js';
import { startServer, request } from './http-test-helpers.js';

const { server, baseUrl } = await startServer();

try {
  const sellerEmail = `seller-${Date.now()}@example.com`;
  const password = 'SellerPassword123!';
  const register = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: sellerEmail, password }) });
  assert.equal(register.response.status, 201, JSON.stringify(register.body));
  assert.equal(register.body.user.role, 'buyer');
  const sellerId = register.body.user.id;
  await query(`UPDATE users SET role = 'seller' WHERE id = $1`, [sellerId]);
  const sellerSession = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: sellerEmail, password }) });
  assert.equal(sellerSession.response.status, 200, JSON.stringify(sellerSession.body));
  assert.equal(sellerSession.body.user.role, 'seller');
  const cookie = sellerSession.cookie;

  const profile = await request(baseUrl, '/api/seller/profile', { method: 'PATCH', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Acceptance Seller', legalName: 'Acceptance Seller Legal', countryCode: 'JP' }) });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.profile.user_id, sellerId);
  assert.equal(profile.body.profile.display_name, 'Acceptance Seller');
  assert.equal(profile.body.profile.country_code, 'JP');

  const buyerEmail = `buyer-${Date.now()}@example.com`;
  const buyerRegister = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: buyerEmail, password }) });
  assert.equal(buyerRegister.response.status, 201, JSON.stringify(buyerRegister.body));
  assert.equal(buyerRegister.body.user.role, 'buyer');
  const buyerId = buyerRegister.body.user.id;

  const product = await query(`INSERT INTO products (seller_id, status, price_amount, price_currency, title, description) VALUES ($1, 'published', 5000, 'JPY', 'Acceptance Product', 'seller payout acceptance fixture') RETURNING id`, [sellerId]);
  const productId = product.rows[0].id;
  const order = await query(`INSERT INTO orders (buyer_id, product_id, amount, currency, status, provider, provider_payment_id, paid_at) VALUES ($1, $2, 5000, 'JPY', 'paid', 'acceptance', $3, NOW()) RETURNING id`, [buyerId, productId, `acceptance-${Date.now()}-${Math.random()}`]);
  const orderId = order.rows[0].id;
  await query(`INSERT INTO seller_earnings (seller_id, order_id, product_id, gross_amount, platform_fee, net_amount, currency, status) VALUES ($1, $2, $3, 5000, 0, 5000, 'JPY', 'available')`, [sellerId, orderId, productId]);

  const earnings = await request(baseUrl, '/api/seller/earnings', { headers: { cookie } });
  assert.equal(earnings.response.status, 200, JSON.stringify(earnings.body));
  assert.equal(Array.isArray(earnings.body.earnings), true);
  assert.equal(earnings.body.earnings.some((item) => Number(item.net_amount) === 5000 && item.status === 'available'), true);

  const payout = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 1000, currency: 'JPY' }) });
  assert.equal(payout.response.status, 201, JSON.stringify(payout.body));
  const payoutId = payout.body.payout.id;
  assert.equal(payout.body.payout.seller_id, undefined);
  assert.equal(Number(payout.body.payout.amount), 1000);
  assert.equal(payout.body.payout.status, 'requested');

  // Only 3,500 JPY remains withdrawable. These two requests are intentionally
  // issued at the same time so the database advisory lock is tested under
  // actual contention: exactly one must succeed and one must be rejected.
  const [concurrentA, concurrentB] = await Promise.all([
    request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 2500, currency: 'JPY' }) }),
    request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 2500, currency: 'JPY' }) }),
  ]);
  const concurrentResults = [concurrentA, concurrentB];
  const successResults = concurrentResults.filter((result) => result.response.status === 201);
  const conflictResults = concurrentResults.filter((result) => result.response.status === 409);
  assert.equal(successResults.length, 1, JSON.stringify(concurrentResults.map((result) => ({ status: result.response.status, body: result.body }))));
  assert.equal(conflictResults.length, 1, JSON.stringify(concurrentResults.map((result) => ({ status: result.response.status, body: result.body }))));
  assert.equal(conflictResults[0].body.error, 'amount_exceeds_withdrawable_balance');
  assert.equal(Number(successResults[0].body.payout.amount), 2500);
  assert.equal(successResults[0].body.payout.status, 'requested');
  const concurrentPayoutId = successResults[0].body.payout.id;

  const adminEmail = `admin-${Date.now()}@example.com`;
  const adminRegister = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password }) });
  assert.equal(adminRegister.response.status, 201, JSON.stringify(adminRegister.body));
  const adminUserId = adminRegister.body.user.id;
  assert.equal(adminRegister.body.user.role, 'buyer');
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminUserId]);
  const adminLogin = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password }) });
  assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.body));
  assert.equal(adminLogin.body.user.role, 'admin');
  const adminCookieAfterLogin = adminLogin.cookie;

  const adminPayouts = await request(baseUrl, '/api/admin/payouts', { headers: { cookie: adminCookieAfterLogin } });
  assert.equal(adminPayouts.response.status, 200, JSON.stringify(adminPayouts.body));
  assert.equal(adminPayouts.body.payouts.some((item) => item.id === payoutId && item.seller_id === sellerId), true);
  assert.equal(adminPayouts.body.payouts.some((item) => item.id === concurrentPayoutId && Number(item.amount) === 2500 && item.seller_id === sellerId), true);

  for (const [from, to] of [['requested', 'reviewing'], ['reviewing', 'approved'], ['approved', 'processing'], ['processing', 'paid']]) {
    const transition = await request(baseUrl, `/api/admin/payouts/${payoutId}/status`, { method: 'POST', headers: { cookie: adminCookieAfterLogin, 'content-type': 'application/json' }, body: JSON.stringify({ status: to }) });
    assert.equal(transition.response.status, 200, JSON.stringify(transition.body));
    assert.equal(transition.body.payout.status, to);
    assert.equal(transition.body.payout.id, payoutId);
    assert.equal(transition.body.payout.seller_id, sellerId);
    assert.equal(Number(transition.body.payout.amount), 1000);
    assert.equal(from === 'processing' ? Boolean(transition.body.payout.paid_at) : true, true);
  }

  const invalidTransition = await request(baseUrl, `/api/admin/payouts/${payoutId}/status`, { method: 'POST', headers: { cookie: adminCookieAfterLogin, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'cancelled' }) });
  assert.equal(invalidTransition.response.status, 409, JSON.stringify(invalidTransition.body));
  assert.equal(invalidTransition.body.error, 'invalid_status_transition');

  const audit = await request(baseUrl, `/api/admin/payouts/${payoutId}/audit`, { headers: { cookie: adminCookieAfterLogin } });
  assert.equal(audit.response.status, 200, JSON.stringify(audit.body));
  assert.ok(Array.isArray(audit.body.events));
  const payoutAuditEvents = audit.body.events.filter((event) => event.resource_id === payoutId);
  assert.equal(payoutAuditEvents.length, 4, JSON.stringify(audit.body));
  assert.deepEqual(payoutAuditEvents.map((event) => event.metadata?.to_status ?? event.details?.to_status ?? event.action).filter(Boolean), ['paid', 'processing', 'approved', 'reviewing']);

  const sellerPayoutsAfterAdmin = await request(baseUrl, '/api/seller/payouts', { headers: { cookie } });
  assert.equal(sellerPayoutsAfterAdmin.response.status, 200, JSON.stringify(sellerPayoutsAfterAdmin.body));
  assert.equal(sellerPayoutsAfterAdmin.body.payouts.some((item) => item.id === concurrentPayoutId && Number(item.amount) === 2500 && item.status === 'requested'), true);
  const persistedPayout = sellerPayoutsAfterAdmin.body.payouts.find((item) => item.id === payoutId);
  assert.equal(persistedPayout.status, 'paid');
  assert.ok(persistedPayout.paid_at);
  console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
