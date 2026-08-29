import assert from 'node:assert/strict';
import { query } from '../src/db.js';
import { startServer, request } from './http-test-helpers.js';

const { server, baseUrl } = await startServer();
const password = 'SellerApplicationPassword123!';

try {
  const buyerEmail = `seller-application-buyer-${Date.now()}@example.com`;
  const register = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: buyerEmail, password }) });
  assert.equal(register.response.status, 201, JSON.stringify(register.body));
  assert.equal(register.body.user.role, 'buyer');
  const buyerId = register.body.user.id;

  const login = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: buyerEmail, password }) });
  assert.equal(login.response.status, 200, JSON.stringify(login.body));
  const buyerCookie = login.cookie;

  const empty = await request(baseUrl, '/api/seller/application', { headers: { cookie: buyerCookie } });
  assert.equal(empty.response.status, 200, JSON.stringify(empty.body));
  assert.equal(empty.body.application, null);

  const invalid = await request(baseUrl, '/api/seller/application', { method: 'POST', headers: { cookie: buyerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: '', legalName: '', countryCode: 'JPN' }) });
  assert.equal(invalid.response.status, 400, JSON.stringify(invalid.body));

  const application = await request(baseUrl, '/api/seller/application', { method: 'POST', headers: { cookie: buyerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Acceptance Creator', legalName: 'Acceptance Creator Legal', countryCode: 'JP', message: 'I want to sell my original video products.' }) });
  assert.equal(application.response.status, 201, JSON.stringify(application.body));
  assert.equal(application.body.application.status, 'pending');
  const applicationId = application.body.application.id;

  const duplicate = await request(baseUrl, '/api/seller/application', { method: 'POST', headers: { cookie: buyerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Duplicate', legalName: 'Duplicate Legal', countryCode: 'JP' }) });
  assert.equal(duplicate.response.status, 409, JSON.stringify(duplicate.body));
  assert.equal(duplicate.body.error, 'seller_application_already_active');

  const sellerEndpointAsBuyer = await request(baseUrl, '/api/seller/profile', { headers: { cookie: buyerCookie } });
  assert.equal(sellerEndpointAsBuyer.response.status, 403, JSON.stringify(sellerEndpointAsBuyer.body));

  const applicationView = await request(baseUrl, '/api/seller/application', { headers: { cookie: buyerCookie } });
  assert.equal(applicationView.response.status, 200, JSON.stringify(applicationView.body));
  assert.equal(applicationView.body.application.id, applicationId);
  assert.equal(applicationView.body.application.status, 'pending');

  const adminEmail = `seller-application-admin-${Date.now()}@example.com`;
  const adminRegister = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password }) });
  assert.equal(adminRegister.response.status, 201, JSON.stringify(adminRegister.body));
  const adminId = adminRegister.body.user.id;
  await query(`UPDATE users SET role = 'admin' WHERE id = $1`, [adminId]);

  const adminLogin = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: adminEmail, password }) });
  assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.body));
  assert.equal(adminLogin.body.user.role, 'admin');
  const adminCookie = adminLogin.cookie;

  const adminList = await request(baseUrl, '/api/admin/seller-applications?status=pending', { headers: { cookie: adminCookie } });
  assert.equal(adminList.response.status, 200, JSON.stringify(adminList.body));
  assert.equal(adminList.body.applications.some((item) => item.id === applicationId && item.user_id === buyerId), true);

  const review = await request(baseUrl, `/api/admin/seller-applications/${applicationId}/review`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'start_review', note: 'Initial review' }) });
  assert.equal(review.response.status, 200, JSON.stringify(review.body));
  assert.equal(review.body.application.status, 'under_review');

  const approve = await request(baseUrl, `/api/admin/seller-applications/${applicationId}/review`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve', note: 'Approved by acceptance test' }) });
  assert.equal(approve.response.status, 200, JSON.stringify(approve.body));
  assert.equal(approve.body.application.status, 'approved');

  const role = await query(`SELECT role FROM users WHERE id = $1`, [buyerId]);
  assert.equal(role.rows[0].role, 'seller');
  const profile = await query(`SELECT user_id, display_name, legal_name, country_code FROM seller_profiles WHERE user_id = $1`, [buyerId]);
  assert.equal(profile.rowCount, 1);
  assert.equal(profile.rows[0].display_name, 'Acceptance Creator');
  assert.equal(profile.rows[0].legal_name, 'Acceptance Creator Legal');
  assert.equal(profile.rows[0].country_code, 'JP');

  const audit = await query(`SELECT action, metadata FROM audit_events WHERE resource_type = 'seller_application' AND resource_id = $1 ORDER BY created_at ASC`, [applicationId]);
  assert.equal(audit.rowCount, 2, JSON.stringify(audit.rows));
  assert.equal(audit.rows[0].action, 'seller.application.start_review');
  assert.equal(audit.rows[1].action, 'seller.application.approve');
  assert.equal(audit.rows[1].metadata.to_status, 'approved');
  assert.equal(audit.rows[1].metadata.user_id, buyerId);

  const sellerLogin = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: buyerEmail, password }) });
  assert.equal(sellerLogin.response.status, 200, JSON.stringify(sellerLogin.body));
  assert.equal(sellerLogin.body.user.role, 'seller');

  const sellerProfile = await request(baseUrl, '/api/seller/profile', { headers: { cookie: sellerLogin.cookie } });
  assert.equal(sellerProfile.response.status, 200, JSON.stringify(sellerProfile.body));
  assert.equal(sellerProfile.body.profile.user_id, buyerId);

  const secondBuyerEmail = `seller-application-reject-${Date.now()}@example.com`;
  const secondRegister = await request(baseUrl, '/api/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: secondBuyerEmail, password }) });
  assert.equal(secondRegister.response.status, 201, JSON.stringify(secondRegister.body));
  const secondLogin = await request(baseUrl, '/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: secondBuyerEmail, password }) });
  const secondCookie = secondLogin.cookie;
  const secondApplication = await request(baseUrl, '/api/seller/application', { method: 'POST', headers: { cookie: secondCookie, 'content-type': 'application/json' }, body: JSON.stringify({ displayName: 'Reject Creator', legalName: 'Reject Creator Legal', countryCode: 'JP' }) });
  assert.equal(secondApplication.response.status, 201, JSON.stringify(secondApplication.body));
  const secondApplicationId = secondApplication.body.application.id;

  const reject = await request(baseUrl, `/api/admin/seller-applications/${secondApplicationId}/review`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reject' }) });
  assert.equal(reject.response.status, 400, JSON.stringify(reject.body));
  assert.equal(reject.body.error, 'review_note_required');

  const rejectWithNote = await request(baseUrl, `/api/admin/seller-applications/${secondApplicationId}/review`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'reject', note: 'Acceptance rejection fixture' }) });
  assert.equal(rejectWithNote.response.status, 200, JSON.stringify(rejectWithNote.body));
  assert.equal(rejectWithNote.body.application.status, 'rejected');

  const secondRole = await query(`SELECT role FROM users WHERE id = $1`, [secondRegister.body.user.id]);
  assert.equal(secondRole.rows[0].role, 'buyer');

  const nonAdminReview = await request(baseUrl, `/api/admin/seller-applications/${secondApplicationId}/review`, { method: 'POST', headers: { cookie: sellerLogin.cookie, 'content-type': 'application/json' }, body: JSON.stringify({ action: 'approve' }) });
  assert.equal(nonAdminReview.response.status, 403, JSON.stringify(nonAdminReview.body));

  console.log('http-seller-application-acceptance: PASS');
} finally {
  await new Promise((resolve) => server.close(resolve));
}
