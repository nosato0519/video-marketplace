import assert from 'node:assert/strict';
import { query } from '../src/db.js';
import { startServer, request } from './http-test-helpers.js';

const { server, baseUrl } = await startServer();

try {
  const sellerEmail = `seller-${Date.now()}@example.com`;
  const password = 'SellerPassword123!';
  const register = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: sellerEmail, password }) });
  assert.equal(register.response.status, 201, JSON.stringify(register.body));
  const cookie = register.cookie;
  const sellerId = register.body.user.id;
  const profile = await request(baseUrl, '/api/seller/profile', { method: 'PUT', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ display_name: 'Acceptance Seller', bio: 'seller acceptance profile' }) });
  assert.equal(profile.response.status, 200, JSON.stringify(profile.body));
  assert.equal(profile.body.profile.seller_id, sellerId);
  const earnings = await request(baseUrl, '/api/seller/earnings', { headers: { cookie } });
  assert.equal(earnings.response.status, 200, JSON.stringify(earnings.body));
  assert.equal(earnings.body.earnings.seller_id, sellerId);
  const payout = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 1000, currency: 'JPY' }) });
  assert.equal(payout.response.status, 201, JSON.stringify(payout.body));
  const payoutId = payout.body.payout.id;
  const concurrentPayout = await request(baseUrl, '/api/seller/payouts', { method: 'POST', headers: { cookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 2500, currency: 'JPY' }) });
  assert.equal(concurrentPayout.response.status, 201, JSON.stringify(concurrentPayout.body));
  const concurrentPayoutId = concurrentPayout.body.payout.id;
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
  const persistedPayout = sellerPayoutsAfterAdmin.body.payouts.find((item) => item.id === payoutId);
  assert.equal(persistedPayout.status, 'paid');
  assert.ok(persistedPayout.paid_at);
  console.log('http-seller-profile-earnings-payout-e2e-acceptance: PASS');
} finally {
  await server.close();
}
