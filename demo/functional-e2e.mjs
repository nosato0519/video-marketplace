import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = Number(process.env.PORT || 4173);
const base = `http://127.0.0.1:${port}`;
const assert = (ok, message) => { if (!ok) throw new Error(message); };
let jar = '';
const child = spawn(process.execPath, ['launcher.mjs'], { cwd: new URL('.', import.meta.url), env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
let output = '';
child.stdout.on('data', b => { output += b.toString(); });
child.stderr.on('data', b => { output += b.toString(); });
async function waitForServer() { for (let i=0;i<40;i++) { try { const r=await fetch(base+'/api/health'); if(r.ok)return; } catch {} await new Promise(r=>setTimeout(r,100)); } throw new Error(`demo server did not start\n${output}`); }
async function req(path, options = {}, useJar = true) {
  const headers = { ...(options.headers || {}), ...(useJar && jar ? { cookie: jar } : {}) };
  const r = await fetch(base + path, { ...options, headers });
  const set = r.headers.get('set-cookie');
  if (set && useJar) jar = set.split(';')[0];
  const type = r.headers.get('content-type') || '';
  return { r, data: type.includes('json') ? await r.json() : await r.arrayBuffer() };
}
try {
  await waitForServer();
  const page = await req('/');
  assert(page.r.ok && page.r.headers.get('content-type')?.includes('text/html'), 'browser page failed');
  const app = await req('/app.js');
  assert(app.r.ok && app.r.headers.get('content-type')?.includes('javascript') && new TextDecoder().decode(app.data).includes('function purchase'), 'browser app asset failed');
  const health = await req('/api/health');
  assert(health.r.ok && health.data.status === 'ok', 'health failed');
  const initial = await req('/api/demo/state');
  assert(initial.r.ok && initial.data.role === 'buyer', 'default buyer session failed');
  const loginBuyer = await req('/api/demo/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({role:'buyer'}) });
  assert(loginBuyer.r.ok, 'buyer login failed');
  const purchase = await req('/api/demo/purchase', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({productId:1}) });
  assert(purchase.r.status === 201 && purchase.data.order.status === 'paid' && purchase.data.order.entitlement === 'active', 'purchase lifecycle failed');
  const media = await req('/api/demo/media/1', { headers:{range:'bytes=0-15'} });
  assert(media.r.status === 206 && media.r.headers.get('content-type') === 'video/webm', 'authorized media failed');
  const freshBlocked = await req('/api/demo/media/1', {}, false);
  assert(freshBlocked.r.status === 404, 'unauthorized media must be rejected');
  const loginSeller = await req('/api/demo/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({role:'seller'}) });
  assert(loginSeller.r.ok && loginSeller.data.role === 'seller', 'seller login failed');
  const product = await req('/api/demo/seller/product', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({title:'E2E Demo Product',category:'Education',price:12}) });
  assert(product.r.status === 201 && product.data.product.mediaReady === false, 'seller product failed');
  const upload = await req('/api/demo/seller/upload', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({productId:product.data.product.id}) });
  assert(upload.r.ok && upload.data.product.mediaReady === true && upload.data.lifecycle.at(-1) === 'ready', 'seller media lifecycle failed');
  const payout = await req('/api/demo/seller/payout', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({amount:125}) });
  assert(payout.r.status === 201 && payout.data.payout.status === 'reviewing', 'seller payout failed');
  const admin = await req('/api/demo/login', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({role:'admin'}) });
  assert(admin.r.ok && admin.data.role === 'admin', 'admin login failed');
  const mod = admin.data.moderationQueue.find(x => x.title === 'E2E Demo Product');
  assert(mod, 'moderation item missing');
  const approve = await req('/api/demo/admin/moderation', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:mod.id,action:'approve'}) });
  assert(approve.r.ok && approve.data.item.status === 'approved', 'moderation approval failed');
  const seller = admin.data.sellerApplications.find(x => x.id === 'SEL-1001');
  const sellerApprove = await req('/api/demo/admin/seller-approval', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({id:seller.id,action:'approve'}) });
  assert(sellerApprove.r.ok && sellerApprove.data.item.status === 'approved', 'seller approval failed');
  console.log('FUNCTIONAL_DEMO_E2E_GREEN');
  console.log('browser page + app asset: PASS');
  console.log('buyer purchase -> entitlement -> protected media: PASS');
  console.log('unauthorized media rejection: PASS');
  console.log('seller product -> upload lifecycle -> payout: PASS');
  console.log('admin moderation -> seller approval: PASS');
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child,'exit'), new Promise(r=>setTimeout(r,1000))]);
}
