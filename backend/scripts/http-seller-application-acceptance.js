import assert from 'node:assert/strict';
import { query } from '../src/db.js';
import { startServer, request } from './http-test-helpers.js';

const { server, baseUrl } = await startServer();
const password = 'SellerApplicationPassword123!';
try {
  const buyerEmail = `seller-application-buyer-${Date.now()}@example.com`;
  const register = await request(baseUrl, '/api/auth/register', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({email:buyerEmail,password}) });
  assert.equal(register.response.status,201); assert.equal(register.body.user.role,'buyer'); const buyerId=register.body.user.id;
  const login = await request(baseUrl,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:buyerEmail,password})});
  assert.equal(login.response.status,200); const buyerCookie=login.cookie;
  const empty=await request(baseUrl,'/api/seller/application',{headers:{cookie:buyerCookie}}); assert.equal(empty.response.status,200); assert.equal(empty.body.application,null);
  const invalid=await request(baseUrl,'/api/seller/application',{method:'POST',headers:{cookie:buyerCookie,'content-type':'application/json'},body:JSON.stringify({displayName:'',legalName:'',countryCode:'JPN'})}); assert.equal(invalid.response.status,400);
  const application=await request(baseUrl,'/api/seller/application',{method:'POST',headers:{cookie:buyerCookie,'content-type':'application/json'},body:JSON.stringify({displayName:'Acceptance Creator',legalName:'Acceptance Creator Legal',countryCode:'JP',message:'I want to sell my original video products.'})});
  assert.equal(application.response.status,201); assert.equal(application.body.application.status,'pending'); const applicationId=application.body.application.id;
  const duplicate=await request(baseUrl,'/api/seller/application',{method:'POST',headers:{cookie:buyerCookie,'content-type':'application/json'},body:JSON.stringify({displayName:'Duplicate',legalName:'Duplicate Legal',countryCode:'JP'})}); assert.equal(duplicate.response.status,409);
  const sellerAsBuyer=await request(baseUrl,'/api/seller/profile',{headers:{cookie:buyerCookie}}); assert.equal(sellerAsBuyer.response.status,403);
  const adminEmail=`seller-application-admin-${Date.now()}@example.com`;
  const adminRegister=await request(baseUrl,'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:adminEmail,password})}); assert.equal(adminRegister.response.status,201); const adminId=adminRegister.body.user.id;
  await query(`UPDATE users SET role='admin' WHERE id=$1`,[adminId]);
  const adminLogin=await request(baseUrl,'/api/auth/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({email:adminEmail,password})}); assert.equal(adminLogin.response.status,200); const adminCookie=adminLogin.cookie;
  const list=await request(baseUrl,'/api/admin/seller-applications?status=pending',{headers:{cookie:adminCookie}}); assert.equal(list.response.status,200); assert.equal(list.body.applications.some(x=>x.id===applicationId&&x.user_id===buyerId),true);
  const review=await request(baseUrl,`/api/admin/seller-applications/${applicationId}/review`,{method:'POST',headers:{cookie:adminCookie,'content-type':'application/json'},body:JSON.stringify({action:'start_review',note:'Initial review'})}); assert.equal(review.response.status,200); assert.equal(review.body.application.status,'under_review');
  const approve=await request(baseUrl,`/api/admin/seller-applications/${applicationId}/review`,{method:'POST',headers:{cookie:adminCookie,'content-type':'application/json'},body:JSON.stringify({action:'approve',note:'Approved by acceptance test'})}); assert.equal(approve.response.status,200); assert.equal(approve.body.application.status,'approved');
  const role=await query(`SELECT role FROM users WHERE id=$1`,[buyerId]); assert.equal(role.rows[0].role,'seller');
  const profile=await query(`SELECT user_id,display_name,legal_name,country_code FROM seller_profiles WHERE user_id=$1`,[buyerId]); assert.equal(profile.rowCount,1); assert.equal(profile.rows[0].country_code,'JP');
  const audit=await query(`SELECT action,metadata FROM audit_events WHERE resource_type='seller_application' AND resource_id=$1 ORDER BY created_at ASC`,[applicationId]); assert.equal(audit.rowCount,2); assert.equal(audit.rows[0].action,'seller.application.start_review'); assert.equal(audit.rows[1].action,'seller.application.approve');
  console.log('http-seller-application-acceptance: PASS');
} finally { await new Promise(resolve=>server.close(resolve)); }
