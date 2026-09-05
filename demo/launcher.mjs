import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(ROOT, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && (url.pathname === '/ott-home.css' || url.pathname === '/ott-home-v2.css' || url.pathname === '/ott-home-v3.css' || url.pathname === '/ott-home-v4.css' || url.pathname === '/ott-home-v5.css' || url.pathname === '/ott-home-v6.css' || url.pathname === '/ott-home-v7.css' || url.pathname === '/ott-home-v8.css' || url.pathname === '/ott-home-v9.css' || url.pathname === '/ott-home-v10.css' || url.pathname === '/ott-home-v11.css' || url.pathname === '/ott-home-v12.css' || url.pathname === '/ott-home-v13.css')) {
    const cssMap = {'/ott-home-v13.css':'ott-home-v13.css','/ott-home-v12.css':'ott-home-v12.css','/ott-home-v11.css':'ott-home-v11.css','/ott-home-v10.css':'ott-home-v10.css','/ott-home-v9.css':'ott-home-v9.css','/ott-home-v8.css':'ott-home-v8.css','/ott-home-v7.css':'ott-home-v7.css','/ott-home-v6.css':'ott-home-v6.css','/ott-home-v5.css':'ott-home-v5.css','/ott-home-v4.css':'ott-home-v4.css','/ott-home-v3.css':'ott-home-v3.css','/ott-home-v2.css':'ott-home-v2.css','/ott-home.css':'ott-home.css'};
    const css = await readFile(join(ROOT, cssMap[url.pathname]), 'utf8');
    res.writeHead(200, {'content-type':'text/css; charset=utf-8','cache-control':'no-store'}); res.end(css); return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    let html = await readFile(join(ROOT, 'index.html'), 'utf8');
    html = html.replace('/ott-home-v3.css?v=20260905-v3', '/ott-home-v13.css?v=20260905-v13');
    html = html.replace('<section class="trustbar">', '<section class="video-showcase"><div class="video-showcase-inner"><div class="video-showcase-head"><div><div class="video-showcase-kicker">CURATED VIDEO COLLECTION</div><h2>作品との出会いを、<br>もっと自由に。</h2></div><p class="video-showcase-copy">ひとつの作品だけではなく、いろんなクリエイターの映像を眺めながら、次に観たい一本を見つける。</p></div><div class="video-showcase-grid"><a class="showcase-card s1"><span class="showcase-index">01</span><div class="showcase-bg"></div><span class="showcase-label">THE LAST SIGNAL</span></a><a class="showcase-card s2"><span class="showcase-index">02</span><div class="showcase-bg"></div><span class="showcase-label">Tokyo After Hours</span></a><a class="showcase-card s3"><span class="showcase-index">03</span><div class="showcase-bg"></div><span class="showcase-label">Build Your Brand</span></a><a class="showcase-card s4"><span class="showcase-index">04</span><div class="showcase-bg"></div><span class="showcase-label">BLUE HORIZON</span></a><a class="showcase-card s5"><span class="showcase-index">05</span><div class="showcase-bg"></div><span class="showcase-label">Mastering Motion</span></a></div><div class="video-showcase-note"><span>DISCOVER / WATCH / PURCHASE</span><span>VIDORA</span></div></div></section><section class="trustbar">');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); res.end(html); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(ROOT, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
try { await import(`file://${temp}`); } finally { try { await unlink(temp); } catch {} }
