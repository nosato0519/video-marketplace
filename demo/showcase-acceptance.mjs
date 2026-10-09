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
const request = async (url, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

try {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await request(`${base}/api/health`);
      if (r.ok) break;
    } catch {}
    if (i === 39) fail('showcase server health check failed');
    await sleep(100);
  }

  const response = await request(`${base}/`);
  const html = await response.text();
  if (!response.ok) fail(`homepage returned HTTP ${response.status}`);

  const required = [
    'VIDEO MARKETPLACE',
    '見つける。',
    '買う。楽しむ。',
    '動画販売に必要なすべてを、',
    '機能・システム',
    'このまま運営できる。',
    'カスタマイズも、自由。',
    '販売者',
    '購入者',
    '運営者',
    'クリエイター',
    'マイライブラリ',
    'Creator Studio'
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

  const stateResponse = await request(`${base}/api/demo/state`);
  if (!stateResponse.ok) fail(`demo state returned HTTP ${stateResponse.status}`);
  const state = await stateResponse.json();
  if (!Array.isArray(state.products) || state.products.length < 5) fail('showcase catalog is incomplete');
  if (!state.products.some(p => p.category === 'Adult')) fail('18+ category is missing');

  console.log('VIDEO MARKETPLACE SHOWCASE ACCEPTANCE: PASS');
  console.log('current storefront presentation: PASS');
  console.log('system showcase and commercial positioning: PASS');
  console.log('catalog/content completeness: PASS');
} catch (error) {
  console.error('VIDEO MARKETPLACE SHOWCASE ACCEPTANCE: FAIL');
  console.error(error?.stack || error);
  if (output) console.error(output);
  process.exitCode = 1;
} finally {
  child.kill('SIGTERM');
  await Promise.race([once(child, 'exit'), sleep(1000)]);
}
