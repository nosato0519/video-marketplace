import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4184;
const root = fileURLToPath(new URL('.', import.meta.url));
const child = spawn(process.execPath, ['link-fix-proxy.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'], detached: true });
let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

async function waitForDemo() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error(`navigation demo server did not become ready\n${output}`);
}

async function request(path) {
  const r = await fetch(`http://127.0.0.1:${port}${path}`);
  const text = await r.text();
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return text;
}

try {
  await waitForDemo();
  const routes = ['/', '/pages/video-list.html', '/pages/product-detail.html', '/pages/checkout.html', '/pages/library.html', '/pages/watch.html', '/pages/creator-studio.html', '/pages/admin.html', '/pages/login.html', '/pages/register.html', '/pages/account.html', '/pages/orders.html', '/pages/legal.html', '/pages/privacy.html'];
  for (const path of routes) {
    const html = await request(path);
    if (!html.includes('site-navigation-integration')) throw new Error(`navigation script missing: ${path}`);
  }
  const home = await request('/');
  for (const routeText of ['販売者デモ', '購入者デモ', '動画を探す', 'クリエイターになる', '販売者ログイン', '購入者ログイン']) {
    if (!home.includes(routeText)) throw new Error(`homepage navigation target text missing: ${routeText}`);
  }
  const homepageFix = home.match(/<script id="homepage-navigation-fix">[\s\S]*?<\/script>/i)?.[0] || '';
  if (!homepageFix) throw new Error('homepage navigation fix missing');
  const requiredTargets = [
    ['販売者デモ', '/pages/creator-studio.html'],
    ['購入者デモ', '/pages/video-list.html'],
    ['販売者ログイン', '/pages/seller-login.html'],
    ['購入者ログイン', '/pages/buyer-login.html']
  ];
  for (const [label, target] of requiredTargets) {
    if (!homepageFix.includes(label) || !homepageFix.includes(`go('${target}')`)) {
      throw new Error(`homepage navigation mapping missing: ${label} -> ${target}`);
    }
  }
  const list = await request('/pages/video-list.html');
  if ((list.match(/class="card"/g) || []).length < 1) throw new Error('video list cards missing');
  console.log('NAVIGATION_E2E_GREEN');
  console.log(`all ${routes.length} routes load through the navigation proxy: PASS`);
  console.log('homepage navigation targets present: PASS');
  console.log('homepage role/demo navigation mappings locked: PASS');
  console.log('video list card entrypoint present: PASS');
  console.log('legal + privacy routes present: PASS');
} finally {
  if (child.pid) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  }
}
