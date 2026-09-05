import { readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const source = await readFile(join(ROOT, 'server.js'), 'utf8');
const marker = "  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`); const s = session(req, res);";
const injected = `${marker}
  if (req.method === 'GET' && (url.pathname === '/ott-home.css' || url.pathname === '/ott-home-v2.css' || url.pathname === '/ott-home-v3.css' || url.pathname === '/ott-home-v4.css')) {
    const cssFile = url.pathname === '/ott-home-v4.css' ? 'ott-home-v4.css' : (url.pathname === '/ott-home-v3.css' ? 'ott-home-v3.css' : (url.pathname === '/ott-home-v2.css' ? 'ott-home-v2.css' : 'ott-home.css'));
    const css = await readFile(join(ROOT, cssFile), 'utf8');
    res.writeHead(200, {'content-type':'text/css; charset=utf-8','cache-control':'no-store'});
    res.end(css); return;
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    let html = await readFile(join(ROOT, 'index.html'), 'utf8');
    html = html.replace('/ott-home-v3.css?v=20260905-v3', '/ott-home-v4.css?v=20260905-v4');
    html = html.replace(/<section class="section category-section">[\s\S]*?<\/section>/, `<section class="section category-section"><div class="section-head"><div><span class="section-kicker">EXPLORE</span><h2>カテゴリーから探す</h2></div><span class="section-kicker">10 CATEGORIES</span></div><div class="category-grid"><a class="cat c1"><b>EDUCATION</b><span>教育・学習</span><i>→</i></a><a class="cat c2"><b>BUSINESS</b><span>ビジネス・仕事</span><i>→</i></a><a class="cat c3"><b>CREATIVE</b><span>映像・クリエイティブ</span><i>→</i></a><a class="cat c4"><b>DOCUMENTARY</b><span>ドキュメンタリー</span><i>→</i></a><a class="cat c5"><b>LIFESTYLE</b><span>ライフスタイル</span><i>→</i></a><a class="cat c6"><b>TRAVEL</b><span>旅・カルチャー</span><i>→</i></a><a class="cat c7"><b>MUSIC</b><span>音楽・ライブ</span><i>→</i></a><a class="cat c8"><b>FITNESS</b><span>フィットネス・健康</span><i>→</i></a><a class="cat c9"><b>COOKING</b><span>料理・フード</span><i>→</i></a><a class="cat c10"><b>18+</b><span>18+ コンテンツ</span><i>→</i></a></div></section>`);
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(html); return;
  }
`;
if (!source.includes(marker)) throw new Error('server injection marker not found');
const patched = source.replace(marker, injected);
const temp = join(ROOT, `.server-${randomUUID()}.mjs`);
await writeFile(temp, patched, 'utf8');
try { await import(`file://${temp}`); } finally { try { await unlink(temp); } catch {} }