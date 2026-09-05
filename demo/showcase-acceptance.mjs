import { spawn } from 'node:child_process';
import { once } from 'node:events';

const port = 4184;
const base = `http://127.0.0.1:${port}`;
const child = spawn(process.execPath, ['launcher.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});
let output = '';
child.stdout.on('data', b => { output += b.toString(); });
child.stderr.on('data', b => { output += b.toString(); });

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const fail = message => { throw new Error(message); };

try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch(`${base}/api/health`);
      if (r.ok) break;
    } catch {}
    if (i === 39) fail('showcase server health check failed');
    await sleep(100);
  }

  const response = await fetch(`${base}/`);
  const html = await response.text();
  if (!response.ok) fail(`homepage returned HTTP ${response.status}`);

  const required = [
    'VIDORA',
    'Premium Video Marketplace',
    '見つける。',
    '買う。楽しむ。',
    '動画を探す',
    '販売を始める',
    '今、選ばれている動画',
    '購入後まで、きちんと設計',
    'クリエイター',
    '安全な購入体験',
    'マイライブラリ',
    'ダウンロード',
    'Creator Studio',
    'categorySection',
    'products',
    'workspace',
    '@media(max-width:650px)',
    '@media(max-width:1050px)',
    '<option value="All categories">All categories</option>'
  ];
  for (const marker of required) {
    if (!html.includes(marker)) fail(`missing showcase marker: ${marker}`);
  }

  const dangerous = [
    'lorem ipsum',
    'TODO: replace',
    'coming soon'
  ];
  const lower = html.toLowerCase();
  for (const marker of dangerous) {
    if (lower.includes(marker)) fail(`unfinished placeholder detected: ${marker}`);
  }

  const asset = await fetch(`${base}/app.js`);
  if (!asset.ok) fail(`application asset returned HTTP ${asset.status}`);
  const app = await asset.text();
  const integrations = [
    ['purchase', /(?:async\s+)?function\s+purchase\s*\(/],
    ['buyerView', /function\s+buyerView\s*\(/],
    ['sellerView', /function\s+sellerView\s*\(/],
    ['adminView', /function\s+adminView\s*\(/],
    ['Download', /Download/],
    ['Protected media', /Protected media/]
  ];
  for (const [marker, pattern] of integrations) {
    if (!pattern.test(app)) fail(`missing functional integration: ${marker}`);
  }

  const stateResponse = await fetch(`${base}/api/demo/state`);
  if (!stateResponse.ok) fail(`demo state returned HTTP ${stateResponse.status}`);
  const state = await stateResponse.json();
  if (!Array.isArray(state.products) || state.products.length < 5) fail('showcase catalog is incomplete');
  if (!state.products.some(p => p.category === 'Adult')) fail('18+ category is missing');

  console.log('VIDORA SHOWCASE ACCEPTANCE: PASS');
  console.log('premium storefront presentation: PASS');
  console.log('buyer/seller/admin navigation integration: PASS');
  console.log('responsive layout markers: PASS');
  console.log('category filter default wiring: PASS');
  console.log('functional app integration markers: PASS');
  console.log('catalog/content completeness: PASS');
} catch (error) {
  console.error('VIDORA SHOWCASE ACCEPTANCE: FAIL');
  console.error(error?.stack || error);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1000)]);
}
