import assert from 'node:assert/strict';
import { query } from '../src/db.js';
import { startServer, request } from './http-test-helpers.js';

const { server, baseUrl } = await startServer();
const password = 'SellerApplicationPassword123!';

try {
  const suffix = Date.now();
  const sellerEmail = 'seller-registration-' + suffix + '@example.com';
  const sellerRegistration = await request(baseUrl, '/api/auth/register-seller', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: sellerEmail,
      password,
      displayName: 'Acceptance Creator',
      legalName: 'Acceptance Creator Legal',
      countryCode: 'JP'
    })
  });
  assert.equal(sellerRegistration.response.status, 201, JSON.stringify(sellerRegistration.body));
  assert.equal(sellerRegistration.body.application.status, 'pending');

  const sellerRow = await query(
    'SELECT id, password_hash, role, status FROM users WHERE email_normalized = $1 LIMIT 1',
    [sellerEmail]
  );
  assert.equal(sellerRow.rowCount, 1);
  assert.equal(sellerRow.rows[0].role, 'seller');
  assert.equal(sellerRow.rows[0].status, 'suspended');
  const applicationId = sellerRegistration.body.application.id;

  const duplicateSeller = await request(baseUrl, '/api/auth/register-seller', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: sellerEmail,
      password,
      displayName: 'Duplicate Creator',
      legalName: 'Duplicate Legal Name',
      countryCode: 'JP'
    })
  });
  assert.equal(duplicateSeller.response.status, 409);
  assert.equal(duplicateSeller.body.error.code, 'EMAIL_ALREADY_REGISTERED');

  const buyerEmail = 'buyer-registration-' + suffix + '@example.com';
  const buyerRegistration = await request(baseUrl, '/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: buyerEmail, password })
  });
  assert.equal(buyerRegistration.response.status, 201, JSON.stringify(buyerRegistration.body));
  assert.equal(buyerRegistration.body.user.role, 'buyer');
  const buyerId = buyerRegistration.body.user.id;

  const buyerLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: buyerEmail, password })
  });
  assert.equal(buyerLogin.response.status, 200, JSON.stringify(buyerLogin.body));
  const buyerCookie = buyerLogin.cookie;

  const oldApplicationEndpoint = await request(baseUrl, '/api/seller/application', {
    method: 'POST',
    headers: { cookie: buyerCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'Must Stay Buyer', legalName: 'Buyer Legal Name', countryCode: 'JP' })
  });
  assert.equal(oldApplicationEndpoint.response.status, 404);
  const buyerSellerRegistration = await request(baseUrl, '/api/auth/register-seller', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: buyerEmail, password, displayName: 'Buyer Attempt', legalName: 'Buyer Legal Name', countryCode: 'JP' })
  });
  assert.equal(buyerSellerRegistration.response.status, 409);

  const adminEmail = 'seller-registration-admin-' + suffix + '@example.com';
  await query(
    "INSERT INTO users (email, email_normalized, password_hash, role, status) VALUES ($1, $1, $2, 'admin', 'active')",
    [adminEmail, sellerRow.rows[0].password_hash]
  );
  const adminLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: adminEmail, password })
  });
  assert.equal(adminLogin.response.status, 200, JSON.stringify(adminLogin.body));
  const adminCookie = adminLogin.cookie;

  const adminList = await request(baseUrl, '/api/admin/seller-applications?status=pending', { headers: { cookie: adminCookie } });
  assert.equal(adminList.response.status, 200, JSON.stringify(adminList.body));
  assert.equal(adminList.body.applications.some((item) => item.id === applicationId && item.user_id === sellerRow.rows[0].id), true);

  const startReview = await request(baseUrl, '/api/admin/seller-applications/' + applicationId + '/review', {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'start_review', note: 'Initial review' })
  });
  assert.equal(startReview.response.status, 200, JSON.stringify(startReview.body));
  assert.equal(startReview.body.application.status, 'under_review');

  const approve = await request(baseUrl, '/api/admin/seller-applications/' + applicationId + '/review', {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'approve', note: 'Approved by acceptance test' })
  });
  assert.equal(approve.response.status, 200, JSON.stringify(approve.body));
  assert.equal(approve.body.application.status, 'approved');

  const sellerAfterApproval = await query('SELECT role, status FROM users WHERE id = $1', [sellerRow.rows[0].id]);
  assert.equal(sellerAfterApproval.rows[0].role, 'seller');
  assert.equal(sellerAfterApproval.rows[0].status, 'active');
  const buyerAfterApproval = await query('SELECT role, status FROM users WHERE id = $1', [buyerId]);
  assert.equal(buyerAfterApproval.rows[0].role, 'buyer');
  assert.equal(buyerAfterApproval.rows[0].status, 'active');

  const profile = await query('SELECT user_id, display_name, legal_name, country_code FROM seller_profiles WHERE user_id = $1', [sellerRow.rows[0].id]);
  assert.equal(profile.rowCount, 1);
  assert.equal(profile.rows[0].display_name, 'Acceptance Creator');
  assert.equal(profile.rows[0].legal_name, 'Acceptance Creator Legal');
  assert.equal(profile.rows[0].country_code, 'JP');

  const sellerLogin = await request(baseUrl, '/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: sellerEmail, password })
  });
  assert.equal(sellerLogin.response.status, 200, JSON.stringify(sellerLogin.body));
  assert.equal(sellerLogin.body.user.role, 'seller');
  const sellerProfile = await request(baseUrl, '/api/seller/profile', { headers: { cookie: sellerLogin.cookie } });
  assert.equal(sellerProfile.response.status, 200, JSON.stringify(sellerProfile.body));
  assert.equal(sellerProfile.body.profile.user_id, sellerRow.rows[0].id);

  const rejectedEmail = 'seller-rejected-' + suffix + '@example.com';
  const rejectedRegistration = await request(baseUrl, '/api/auth/register-seller', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: rejectedEmail, password, displayName: 'Rejected Creator', legalName: 'Rejected Legal Name', countryCode: 'JP' })
  });
  assert.equal(rejectedRegistration.response.status, 201, JSON.stringify(rejectedRegistration.body));
  const rejectedApplicationId = rejectedRegistration.body.application.id;
  const reject = await request(baseUrl, '/api/admin/seller-applications/' + rejectedApplicationId + '/review', {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'reject' })
  });
  assert.equal(reject.response.status, 400);
  const rejectWithNote = await request(baseUrl, '/api/admin/seller-applications/' + rejectedApplicationId + '/review', {
    method: 'POST',
    headers: { cookie: adminCookie, 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'reject', note: 'Acceptance rejection fixture' })
  });
  assert.equal(rejectWithNote.response.status, 200, JSON.stringify(rejectWithNote.body));
  const rejectedUser = await query('SELECT role, status FROM users WHERE email_normalized = $1', [rejectedEmail]);
  assert.equal(rejectedUser.rows[0].role, 'seller');
  assert.equal(rejectedUser.rows[0].status, 'suspended');

  const audit = await query("SELECT action, metadata FROM audit_events WHERE resource_type = 'seller_application' AND resource_id = $1 ORDER BY created_at ASC", [applicationId]);
  assert.equal(audit.rowCount, 2, JSON.stringify(audit.rows));
  assert.equal(audit.rows[0].action, 'seller.application.start_review');
  assert.equal(audit.rows[1].action, 'seller.application.approve');
  assert.equal(audit.rows[1].metadata.to_status, 'approved');
  assert.equal(audit.rows[1].metadata.user_id, sellerRow.rows[0].id);

  console.log('HTTP seller registration acceptance passed');
} finally {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
}
