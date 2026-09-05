import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(ROOT, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && (url.pathname === '/ott-home.css' || url.pathname === '/ott-home-v2.css' || url.pathname === '/ott-home-v3.css' || url.pathname === '/ott-home-v4.css' || url.pathname === '/ott-home-v5.css' || url.pathname === '/ott-home-v6.css' || url.pathname === '/ott-home-v7.css' || url.pathname === '/ott-home-v8.css' || url.pathname === '/ott-home-v9.css' || url.pathname === '/ott-home-v10.css')) {
    const cssMap = {'/ott-home-v10.css':'ott-home-v10.css','/ott-home-v9.css':'ott-home-v9.css','/ott-home-v8.css':'ott-home-v8.css','/ott-home-v7.css':'ott-home-v7.css','/ott-home-v6.css':'ott-home-v6.css','/ott-home-v5.css':'ott-home-v5.css','/ott-home-v4.css':'ott-home-v4.css','/ott-home-v3.css':'ott-home-v3.css','/ott-home-v2.css':'ott-home-v2.css','/ott-home.css':'ott-home.css'};
    const css = await readFile(join(ROOT, cssMap[url.pathname]), 'utf8');
    res.writeHead(200, {'content-type':'text/css; charset=utf-8','cache-control':'no-store'});
    res.end(css); return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    let html = await readFile(join(ROOT, 'index.html'), 'utf8');
    html = html.replace('/ott-home-v3.css?v=20260905-v3', '/ott-home-v10.css?v=20260905-v10');
    html = html.replace('<section class="trustbar">', '<section class="impact-section"><div class="impact-inner"><h2 class="impact-title"><span>WATCH.</span><span>BUY.</span><span class="accent-word">OWN.</span></h2><div class="impact-copy"><strong>映像を、もっと自由に。</strong><span>ここにしかない作品とクリエイターに出会い、好きな作品を自分のライブラリへ。VIDORAは、見る人と作る人をひとつにつなぐ動画マーケットプレイスです。</span><div class="impact-rule"></div><div class="impact-index"><span>DISCOVER / PURCHASE / ENJOY</span><span>VIDORA</span></div></div></div></section><section class="trustbar">');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(html); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(ROOT, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
try { await import(`file://${temp}`); } finally { try { await unlink(temp); } catch {} }
