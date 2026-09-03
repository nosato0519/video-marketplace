import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 4183;
const child = spawn(process.execPath, ['launcher.mjs'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

async function request(path, options = {}) {
  return fetch(`http://127.0.0.1:${port}${path}`, options);
}
async function waitHealth() {
  for (let i = 0; i < 50; i++) {
    try { const r = await request('/health'); if (r.ok) return; } catch {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error(`demo server failed to start\n${output}`);
}
function cookieOf(r) { return r.headers.getSetCookie?.()[0]?.split(';')[0] || r.headers.get('set-cookie')?.split(';')[0] || ''; }
async function json(path, options = {}) { const r = await request(path, options); const data = await r.json(); if (!r.ok) throw new Error(`${path}: ${JSON.stringify(data)}`); return data; }

try {
  await waitHealth();
  const root = await request('/');
  const html = await root.text();
  if (!root.ok || !html.includes('VIDORA') || !html.includes('All categories')) throw new Error('browser entrypoint failed');
  const asset = await request('/app.js');
  const js = await asset.text();
  if (!asset.ok || !js.includes('function purchase') || !js.includes('function sellerView') || !js.includes('function adminView')) throw new Error('browser application asset incomplete');

  const initialState = await json('/api/demo/state');
  if (!Array.isArray(initialState.products) || initialState.products.length < 5) throw new Error('catalog state incomplete');
  if (!initialState.products.some(p => p.category === 'Adult 18+')) throw new Error('18+ catalog category missing');

  const freshMedia = await request('/api/demo/media/1');
  if (![401, 404].includes(freshMedia.status)) throw new Error(`unauthorized media status ${freshMedia.status}`);

  const loginBuyer = await request('/api/demo/login', { method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify({ role: 'buyer' }) });
  if (!loginBuyer.ok) throw new Error('buyer login failed');
  const buyerCookie = cookieOf(loginBuyer);
  const purchase = await json('/api/demo/purchase', { method:'POST', headers:{'content-type':'application/json', cookie:buyerCookie}, body:JSON.stringify({productId:1}) });
  if (purchase.order.status !== 'paid' || !purchase.state.purchases.includes(1)) throw new Error('buyer purchase/entitlement failed');
  const media = await request('/api/demo/media/1', { headers:{cookie:buyerCookie} });
  if (!media.ok || !media.headers.get('content-type')?.includes('video/webm')) throw new Error('authorized media failed');
  const mediaBytes = await media.arrayBuffer();
  if (mediaBytes.byteLength < 32) throw new Error('authorized media body is empty');
  const download = await request('/api/demo/media/1?download=1', { headers:{cookie:buyerCookie} });
  if (!download.ok || !download.headers.get('content-disposition')?.includes('attachment')) throw new Error('authorized download failed');
  const downloadBytes = await download.arrayBuffer();
  if (downloadBytes.byteLength !== mediaBytes.byteLength) throw new Error('download body differs from watch media');

  const loginSeller = await request('/api/demo/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({role:'seller'}) });
  if (!loginSeller.ok) throw new Error('seller login failed');
  const sellerCookie = cookieOf(loginSeller);
  const sellerOnly = await request('/api/demo/seller/product', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({title:'Unauthorized Seller Call',category:'Creative',price:10}) });
  if (![401,403].includes(sellerOnly.status)) throw new Error(`seller authorization status ${sellerOnly.status}`);
  const product = await json('/api/demo/seller/product', { method:'POST', headers:{'content-type':'application/json',cookie:sellerCookie}, body:JSON.stringify({title:'Demo Creator Product',category:'Creative',price:25}) });
  const uploaded = await json('/api/demo/seller/upload', { method:'POST', headers:{'content-type':'application/json',cookie:sellerCookie}, body:JSON.stringify({productId:product.product.id}) });
  if (!uploaded.product.mediaReady) throw new Error('seller media lifecycle failed');
  const payout = await json('/api/demo/seller/payout', { method:'POST', headers:{'content-type':'application/json',cookie:sellerCookie}, body:JSON.stringify({amount:125}) });
  if (!payout.payout.id) throw new Error('seller payout failed');

  const loginAdmin = await request('/api/demo/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({role:'admin'}) });
  if (!loginAdmin.ok) throw new Error('admin login failed');
  const adminCookie = cookieOf(loginAdmin);
  const moderation = await json('/api/demo/admin/moderation', { method:'POST', headers:{'content-type':'application/json',cookie:adminCookie}, body:JSON.stringify({id:product.product.id,action:'approve'}) });
  const approval = await json('/api/demo/admin/seller-approval', { method:'POST', headers:{'content-type':'application/json',cookie:adminCookie}, body:JSON.stringify({id:'APP-1001',action:'approve'}) });
  if (!moderation.state || !approval.state) throw new Error('admin workflow failed');

  console.log('FUNCTIONAL_DEMO_E2E_GREEN');
  console.log('browser page + catalog + app asset: PASS');
  console.log('buyer purchase -> entitlement -> protected watch + download: PASS');
  console.log('unauthorized media rejection: PASS');
  console.log('seller authorization -> product -> upload lifecycle -> payout: PASS');
  console.log('admin moderation -> seller approval: PASS');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), new Promise(r => setTimeout(r, 1000))]);
}
