import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const port = 4184;
const root = fileURLToPath(new URL('.', import.meta.url));
const child = spawn(process.execPath, ['safe-proxy.mjs'], { cwd: root, env: { ...process.env, PORT: String(port) }, stdio: ['ignore','pipe','pipe'], detached: true });
let output = '';
child.stdout.on('data', d => output += d.toString());
child.stderr.on('data', d => output += d.toString());

async function waitForDemo(){for(let attempt=0;attempt<40;attempt+=1){try{const r=await fetch(`http://127.0.0.1:${port}/`);if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,250));}throw new Error(`navigation demo server did not become ready\n${output}`);}
async function request(path){const r=await fetch(`http://127.0.0.1:${port}${path}`);const text=await r.text();if(!r.ok)throw new Error(`${path}: HTTP ${r.status}`);return text;}

try{
  await waitForDemo();
  const routes=['/','/pages/video-list.html','/pages/product-detail.html','/pages/checkout.html','/pages/library.html','/pages/watch.html','/pages/creator-studio.html','/pages/admin.html','/pages/login.html','/pages/register.html','/pages/account.html','/pages/orders.html','/pages/legal.html','/pages/privacy.html'];
  for(const path of routes){const html=await request(path);if(!html.includes('id="site-navigation-integration"'))throw new Error(`canonical navigation script missing: ${path}`);}
  const home=await request('/');
  for(const label of ['販売者デモ','購入者デモ','動画を探す','クリエイターになる','販売者ログイン','購入者ログイン'])if(!home.includes(label))throw new Error(`homepage navigation label missing: ${label}`);
  const navScripts=home.match(/<script id="site-navigation-integration">[\s\S]*?<\/script>/gi)||[];
  if(navScripts.length!==1)throw new Error(`canonical homepage navigation count invalid: ${navScripts.length}`);
  const nav=navScripts[0];
  const required=[['販売者デモ','/pages/creator-studio.html'],['購入者デモ','/pages/account.html'],['販売者ログイン','/pages/login.html'],['購入者ログイン','/pages/login.html']];
  for(const [label,target] of required)if(!nav.includes(label)||!nav.includes(target))throw new Error(`homepage mapping missing: ${label} -> ${target}`);
  if(/if\(text==='ログイン'\)\{[^}]*go\(/.test(nav))throw new Error('parent login trigger must not navigate');
  const list=await request('/pages/video-list.html');
  if((list.match(/class="card"/g)||[]).length<1)throw new Error('video list cards missing');
  const detail=await request('/pages/product-detail.html?product=7');
  if(!detail.includes('safe-detail-data'))throw new Error('video detail data integration missing');
  console.log('NAVIGATION_E2E_GREEN');
  console.log(`all ${routes.length} routes load through the canonical navigation proxy: PASS`);
  console.log('homepage has one canonical navigation integration: PASS');
  console.log('buyer/seller demo + login mappings: PASS');
  console.log('parent login remains dropdown-only: PASS');
  console.log('video list + detail integrations: PASS');
}finally{if(child.pid){try{process.kill(-child.pid,'SIGTERM');}catch{try{child.kill('SIGTERM');}catch{}}}}
