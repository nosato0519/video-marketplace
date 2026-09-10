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
  for (const path of ['/', '/pages/video-list.html', '/pages/product-detail.html', '/pages/checkout.html', '/pages/library.html', '/pages/watch.html', '/pages/creator-studio.html', '/pages/admin.html', '/pages/login.html', '/pages/register.html', '/pages/account.html', '/pages/orders.html']) {
    const html = await request(path);
    if (!html.includes('site-navigation-integration')) throw new Error(`navigation script missing: ${path}`);
  }
  const home = await request('/');
  for (const routeText of ['販売者デモ', '購入者デモ', '動画を探す', 'クリエイターになる', '販売者ログイン', '購入者ログイン']) {
    if (!home.includes(routeText)) throw new Error(`homepage navigation target text missing: ${routeText}`);
  }
  const list = await request('/pages/video-list.html');
  if ((list.match(/class="card"/g) || []).length < 1) throw new Error('video list cards missing');
  console.log('NAVIGATION_E2E_GREEN');
  console.log('all 12 routes load through the navigation proxy: PASS');
  console.log('homepage navigation targets present: PASS');
  console.log('video list card entrypoint present: PASS');
} finally {
  if (child.pid) {
    try { process.kill(-child.pid, 'SIGTERM'); } catch { try { child.kill('SIGTERM'); } catch {} }
  }
}
