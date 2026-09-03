import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 4183;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['server.js'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', b => { output += b.toString(); });
child.stderr.on('data', b => { output += b.toString(); });

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function request(path, options = {}) {
  const response = await fetch(base + path, options);
  const text = await response.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { response, data, text };
}
function cookieFrom(response) {
  const values = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : [];
  const fallback = response.headers.get('set-cookie');
  const value = values[0] || fallback;
  return value?.split(';')[0];
}
function assert(ok, message) { if (!ok) throw new Error(message); }

try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { const r = await request('/api/health'); if (r.response.ok) { ready = true; break; } } catch {}
    await sleep(100);
  }
  assert(ready, 'health endpoint did not become ready');

  const home = await request('/');
  assert(home.response.ok && home.text.includes('VIDORA'), 'demo page is not served');

  const state = await request('/api/demo/state');
  assert(state.response.ok && Array.isArray(state.data.products) && state.data.products.length >= 5, 'catalog state is incomplete');

  const unauthorized = await request('/api/demo/media/1');
  assert(unauthorized.response.status === 404, 'media must be protected before purchase');

  const purchase = await request('/api/demo/purchase', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ productId: 1 }) });
  assert(purchase.response.status === 201 && purchase.data.order.status === 'paid' && purchase.data.order.entitlement === 'active', 'buyer purchase flow failed');

  const sessionCookie = cookieFrom(purchase.response);
  assert(sessionCookie, 'demo session cookie was not issued');

  const authorized = await request('/api/demo/media/1', { headers: { cookie: sessionCookie } });
  assert(authorized.response.ok && authorized.response.headers.get('content-type')?.startsWith('video/webm'), 'authorized media access failed');

  const download = await request('/api/demo/media/1?download=1', { headers: { cookie: sessionCookie } });
  assert(download.response.ok && (download.response.headers.get('content-disposition') || '').startsWith('attachment'), 'protected download flow failed');

  const sellerLogin = await request('/api/demo/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'seller' }) });
  assert(sellerLogin.response.ok, 'seller login failed');
  const sellerCookie = cookieFrom(sellerLogin.response);
  assert(sellerCookie, 'seller session cookie was not issued');

  const created = await request('/api/demo/seller/product', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ title: 'Demo Creator Course', category: 'Education', price: 18 }) });
  assert(created.response.status === 201 && created.data.product.status === 'published', 'seller product creation failed');

  const uploaded = await request('/api/demo/seller/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ productId: created.data.product.id }) });
  assert(uploaded.response.ok && uploaded.data.product.mediaReady === true, 'seller media lifecycle failed');

  const payout = await request('/api/demo/seller/payout', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'application/json' }, body: JSON.stringify({ amount: 120 }) });
  assert(payout.response.status === 201 && payout.data.payout.status === 'reviewing', 'seller payout request failed');

  const adminLogin = await request('/api/demo/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'admin' }) });
  assert(adminLogin.response.ok, 'admin login failed');
  const adminCookie = cookieFrom(adminLogin.response);
  assert(adminCookie, 'admin session cookie was not issued');

  const adminState = await request('/api/demo/state', { headers: { cookie: adminCookie } });
  assert(adminState.data.moderationQueue.length >= 1 && adminState.data.sellerApplications.length >= 1, 'admin queues are incomplete');

  const moderationId = adminState.data.moderationQueue.find(x => x.status === 'pending')?.id;
  if (moderationId) {
    const moderation = await request('/api/demo/admin/moderation', { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: moderationId, action: 'approve' }) });
    assert(moderation.response.ok && moderation.data.item.status === 'approved', 'admin moderation flow failed');
  }

  const sellerId = adminState.data.sellerApplications.find(x => x.status === 'pending')?.id;
  if (sellerId) {
    const approval = await request('/api/demo/admin/seller-approval', { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ id: sellerId, action: 'approve' }) });
    assert(approval.response.ok && approval.data.item.status === 'approved', 'admin seller approval flow failed');
  }

  console.log('VIDORA DEMO VERIFICATION: PASS');
  console.log('buyer: purchase + entitlement + watch + download');
  console.log('seller: product + media lifecycle + payout');
  console.log('admin: moderation + seller approval');
  console.log('security: unauthorized media rejected');
} catch (error) {
  console.error('VIDORA DEMO VERIFICATION: FAIL');
  console.error(error?.stack || error);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1000)]);
}
