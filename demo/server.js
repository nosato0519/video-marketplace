import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const INDEX = join(ROOT, 'index.html');
const MEDIA = join(ROOT, 'media', 'demo-video.webm');
const PORT = Number(process.env.PORT || 4173);

const products = [
  { id: 1, title: 'Creator Masterclass', category: 'Education', seller: 'Nova Studio', price: 24, rating: 4.9, meta: '4K • 78 min', kind: 'edu' },
  { id: 2, title: 'Cinematic Travel Pack', category: 'Film', seller: 'Luma Collective', price: 19, rating: 4.8, meta: '4K • 52 min', kind: 'film' },
  { id: 3, title: 'Build Your Digital Product', category: 'Business', seller: 'Alex Rivera', price: 29, rating: 5, meta: '1080p • 96 min', kind: 'biz' },
  { id: 4, title: 'Motion Design Toolkit', category: 'Creative', seller: 'Mika Chen', price: 15, rating: 4.7, meta: '4K • 41 min', kind: 'creative' },
  { id: 5, title: '18+ After Dark Collection', category: 'Adult', seller: 'Velvet Studio', price: 22, rating: 4.8, meta: 'HD • 64 min • 18+', kind: 'adult' },
];

const sessions = new Map();
const orders = [];
const sellerProducts = [];
const payoutRequests = [];
const moderationQueue = [{ id: 'MOD-1001', title: 'New Creator Course', seller: 'Demo Creator', status: 'pending' }];
const sellerApplications = [{ id: 'SEL-1001', seller: 'Demo Creator', status: 'pending' }];

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(body);
}
function page(res) { readFile(INDEX).then(body => { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }); res.end(body); }).catch(() => json(res, 500, { error: 'demo page unavailable' })); }
function session(req, res) {
  const cookie = req.headers.cookie || '';
  const match = cookie.match(/vidora_demo=([^;]+)/);
  if (match && sessions.has(match[1])) return sessions.get(match[1]);
  const id = randomUUID();
  const value = { id, role: 'buyer', purchases: new Set(), uploaded: [], account: { email: 'demo-buyer@example.test', verified: true } };
  sessions.set(id, value);
  res.setHeader('set-cookie', `vidora_demo=${id}; Path=/; HttpOnly; SameSite=Lax`);
  return value;
}
async function body(req) { let data = ''; for await (const chunk of req) data += chunk; if (!data) return {}; try { return JSON.parse(data); } catch { return {}; } }
function requireRole(s, role, res) { if (s.role !== role) { json(res, 403, { error: 'ROLE_REQUIRED', role }); return false; } return true; }
function state(s) { return { role: s.role, account: s.account, products: products.map(p => ({ ...p })), purchases: [...s.purchases], orders: orders.filter(o => o.sessionId === s.id), sellerProducts: s.uploaded.map(id => sellerProducts.find(p => p.id === id)).filter(Boolean), payouts: payoutRequests.filter(p => p.sessionId === s.id), moderationQueue, sellerApplications }; }

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const s = session(req, res);
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return page(res);
  if (req.method === 'GET' && url.pathname === '/api/demo/state') return json(res, 200, state(s));
  if (req.method === 'POST' && url.pathname === '/api/demo/login') {
    const data = await body(req); const role = ['buyer', 'seller', 'admin'].includes(data.role) ? data.role : 'buyer';
    s.role = role; s.account = role === 'buyer' ? { email: 'demo-buyer@example.test', verified: true } : role === 'seller' ? { email: 'demo-seller@example.test', verified: true, creator: 'Demo Creator' } : { email: 'demo-admin@example.test', verified: true, operator: 'Demo Operator' };
    return json(res, 200, state(s));
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/purchase') {
    const data = await body(req); const product = products.find(p => p.id === Number(data.productId));
    if (!product) return json(res, 404, { error: 'PRODUCT_NOT_FOUND' });
    s.role = 'buyer'; s.purchases.add(product.id); const order = { id: `DEMO-${1000 + orders.length + 1}`, sessionId: s.id, productId: product.id, status: 'paid', total: product.price, entitlement: 'active', createdAt: new Date().toISOString() }; orders.push(order);
    return json(res, 201, { order, product, state: state(s) });
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/seller/product') {
    if (!requireRole(s, 'seller', res)) return;
    const data = await body(req); const p = { id: `USR-${sellerProducts.length + 1}`, title: String(data.title || 'Demo Video'), category: String(data.category || 'Education'), price: Number(data.price || 10), seller: 'Demo Creator', status: 'published', mediaReady: false, rating: 5, meta: 'Demo media' };
    sellerProducts.push(p); s.uploaded.push(p.id); moderationQueue.push({ id: `MOD-${1002 + moderationQueue.length}`, title: p.title, seller: p.seller, status: 'pending' });
    return json(res, 201, { product: p, state: state(s) });
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/seller/upload') {
    if (!requireRole(s, 'seller', res)) return;
    const data = await body(req); const p = sellerProducts.find(x => x.id === data.productId); if (!p) return json(res, 404, { error: 'PRODUCT_NOT_FOUND' }); p.mediaReady = true; p.status = 'published'; return json(res, 200, { product: p, lifecycle: ['received', 'signature_validated', 'stored', 'ready'], state: state(s) });
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/seller/payout') {
    if (!requireRole(s, 'seller', res)) return;
    const payout = { id: `PO-${1000 + payoutRequests.length + 1}`, sessionId: s.id, amount: Number((await body(req)).amount || 100), status: 'reviewing' }; payoutRequests.push(payout); return json(res, 201, { payout, state: state(s) });
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/admin/moderation') {
    if (!requireRole(s, 'admin', res)) return;
    const data = await body(req); const item = moderationQueue.find(x => x.id === data.id); if (!item) return json(res, 404, { error: 'MODERATION_NOT_FOUND' }); item.status = data.action === 'reject' ? 'rejected' : 'approved'; return json(res, 200, { item, state: state(s) });
  }
  if (req.method === 'POST' && url.pathname === '/api/demo/admin/seller-approval') {
    if (!requireRole(s, 'admin', res)) return;
    const data = await body(req); const item = sellerApplications.find(x => x.id === data.id); if (!item) return json(res, 404, { error: 'SELLER_NOT_FOUND' }); item.status = data.action === 'reject' ? 'rejected' : 'approved'; return json(res, 200, { item, state: state(s) });
  }
  if (req.method === 'GET' && url.pathname.startsWith('/api/demo/media/')) {
    const id = Number(url.pathname.split('/').pop()); if (!s.purchases.has(id)) return json(res, 404, { error: 'MEDIA_NOT_AUTHORIZED' });
    const product = products.find(p => p.id === id); if (!product) return json(res, 404, { error: 'PRODUCT_NOT_FOUND' });
    const file = await readFile(MEDIA); const range = req.headers.range; let start = 0, end = file.length - 1;
    if (range) { const m = range.match(/bytes=(\d*)-(\d*)/); if (m) { if (m[1]) start = Number(m[1]); if (m[2]) end = Number(m[2]); if (end >= file.length) end = file.length - 1; if (start > end) return json(res, 416, { error: 'INVALID_RANGE' }); } }
    const chunk = file.subarray(start, end + 1); const headers = { 'content-type': 'video/webm', 'content-length': chunk.length, 'accept-ranges': 'bytes', 'content-disposition': url.searchParams.get('download') === '1' ? `attachment; filename="${product.id}-vidora-demo.webm"` : 'inline', 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' }; if (range) headers['content-range'] = `bytes ${start}-${end}/${file.length}`; res.writeHead(range ? 206 : 200, headers); return res.end(chunk);
  }
  if (req.method === 'GET' && url.pathname === '/api/health') return json(res, 200, { status: 'ok', mode: 'demo', service: 'vidora-demo' });
  return json(res, 404, { error: 'NOT_FOUND' });
});
server.listen(PORT, () => console.log(`VIDORA functional demo listening on http://localhost:${PORT}`));
