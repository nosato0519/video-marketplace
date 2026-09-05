import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(ROOT, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && (url.pathname === '/ott-home.css' || url.pathname === '/ott-home-v2.css' || url.pathname === '/ott-home-v3.css' || url.pathname === '/ott-home-v4.css' || url.pathname === '/ott-home-v5.css' || url.pathname === '/ott-home-v6.css' || url.pathname === '/ott-home-v7.css' || url.pathname === '/ott-home-v8.css' || url.pathname === '/ott-home-v9.css' || url.pathname === '/ott-home-v10.css' || url.pathname === '/ott-home-v11.css')) {
    const cssMap = {'/ott-home-v11.css':'ott-home-v11.css','/ott-home-v10.css':'ott-home-v10.css','/ott-home-v9.css':'ott-home-v9.css','/ott-home-v8.css':'ott-home-v8.css','/ott-home-v7.css':'ott-home-v7.css','/ott-home-v6.css':'ott-home-v6.css','/ott-home-v5.css':'ott-home-v5.css','/ott-home-v4.css':'ott-home-v4.css','/ott-home-v3.css':'ott-home-v3.css','/ott-home-v2.css':'ott-home-v2.css','/ott-home.css':'ott-home.css'};
    const css = await readFile(join(ROOT, cssMap[url.pathname]), 'utf8');
    res.writeHead(200, {'content-type':'text/css; charset=utf-8','cache-control':'no-store'});
    res.end(css); return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    let html = await readFile(join(ROOT, 'index.html'), 'utf8');
    html = html.replace('/ott-home-v3.css?v=20260905-v3', '/ott-home-v11.css?v=20260905-v11');
    html = html.replace('<section class="trustbar">', '<section class="stagger-gallery"><div class="stagger-gallery-head"><h2>人気の動画</h2><p>いろんなクリエイターの作品を、ひとつの場所から。段違いのリズムで作品を眺めながら、気になる一本へ。</p></div><div class="stagger-track"><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">01</span><div class="thumb t1"></div></div><div class="stagger-meta"><span>DOCUMENTARY</span><span class="stagger-price">¥1,980</span></div><h3 class="stagger-title">THE LAST SIGNAL</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">02</span><div class="thumb t2"></div></div><div class="stagger-meta"><span>CREATIVE</span><span class="stagger-price">¥980</span></div><h3 class="stagger-title">Tokyo After Hours</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">03</span><div class="thumb t3"></div></div><div class="stagger-meta"><span>BUSINESS</span><span class="stagger-price">¥1,480</span></div><h3 class="stagger-title">Build Your Brand</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">04</span><div class="thumb t4"></div></div><div class="stagger-meta"><span>FILM</span><span class="stagger-price">¥780</span></div><h3 class="stagger-title">BLUE HORIZON</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">05</span><div class="thumb t5"></div></div><div class="stagger-meta"><span>EDUCATION</span><span class="stagger-price">¥2,400</span></div><h3 class="stagger-title">Mastering Motion</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">06</span><div class="thumb t6"></div></div><div class="stagger-meta"><span>LIFESTYLE</span><span class="stagger-price">¥1,200</span></div><h3 class="stagger-title">Mountain Silence</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">07</span><div class="thumb t7"></div></div><div class="stagger-meta"><span>TRAVEL</span><span class="stagger-price">¥1,380</span></div><h3 class="stagger-title">KYOTO IN MOTION</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">08</span><div class="thumb t8"></div></div><div class="stagger-meta"><span>MUSIC</span><span class="stagger-price">¥680</span></div><h3 class="stagger-title">NIGHT SESSION</h3></a><a class="stagger-card" href="#"><div class="stagger-thumb"><span class="stagger-num">09</span><div class="thumb t9"></div></div><div class="stagger-meta"><span>DOCUMENTARY</span><span class="stagger-price">¥1,680</span></div><h3 class="stagger-title">THE CRAFTSMEN</h3></a></div></section><section class="trustbar">');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(html); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(ROOT, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
try { await import(`file://${temp}`); } finally { try { await unlink(temp); } catch {} }
