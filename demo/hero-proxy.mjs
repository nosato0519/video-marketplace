import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicPort = Number(process.env.PORT || 4173);
const upstreamPort = publicPort === 4173 ? 4174 : 4173;
const ROOT = fileURLToPath(new URL('.', import.meta.url));
spawn(process.execPath, ['launcher.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(upstreamPort) }, stdio: 'inherit' });

const HERO_STYLE = `<style id="hero-size-final">.hero{min-height:844px!important;height:844px!important}.hero-copy{padding-top:132px!important;padding-left:8.75vw!important;max-width:900px!important;transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{top:131px!important;right:3.5vw!important;width:650px!important;height:506px!important;transform:scale(1.25)!important;transform-origin:top right!important}.system-showcase{display:block!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:2!important;margin:0!important}@media(max-width:900px){.hero{min-height:760px!important;height:760px!important}.hero-copy{padding-top:110px!important;padding-left:7vw!important;max-width:82vw!important;transform:scale(1.15)!important}.hero-mosaic{top:330px!important;right:-20px!important;width:430px!important;height:335px!important;transform:scale(1.05)!important}}@media(max-width:650px){.hero{min-height:700px!important;height:700px!important}.hero-copy{padding-top:82px!important;padding-left:6vw!important;max-width:88vw!important;transform:scale(1)!important}.hero-mosaic{top:370px!important;right:-65px!important;width:390px!important;height:304px!important;transform:scale(.9)!important;opacity:.9}}</style>`;
const GUIDE_STYLE = `<style id="system-guide-teaser-style">.system-guide-teaser{margin:48px auto 72px;max-width:1180px;padding:0 28px;display:block!important;visibility:visible!important;opacity:1!important}.system-guide-teaser-inner{border:1px solid rgba(183,155,91,.38);background:linear-gradient(120deg,#111114,#15130f);padding:42px 50px;display:flex;align-items:center;justify-content:space-between;gap:40px}.system-guide-teaser .kicker{font-size:10px;letter-spacing:.28em;color:#b79b5b}.system-guide-teaser h2{font-size:32px;line-height:1.3;margin:10px 0}.system-guide-teaser p{color:#aaa6a0;max-width:650px;margin:0;font-size:14px;line-height:1.9}.system-guide-teaser a{flex:0 0 auto;border:1px solid #b79b5b;color:#d5ba79;padding:13px 22px;font-size:12px;letter-spacing:.08em}.system-guide-nav{white-space:nowrap}@media(max-width:760px){.system-guide-teaser-inner{padding:32px 25px;display:block}.system-guide-teaser a{display:inline-block;margin-top:22px}}</style>`;
const GUIDE_TEASER = `<section class="system-guide-teaser"><div class="system-guide-teaser-inner"><div><span class="kicker">FOR PLATFORM OPERATORS</span><h2>そのまま運営。カスタマイズも自由。</h2><p>完成された動画販売システムとして、このまま動画販売サイトを運営することも可能。さらに、ロゴ・サイト名・カラー・画像・カテゴリー・メニュー・コンテンツ・デザインまで、あなたのブランドやビジネスに合わせて自由にカスタマイズできます。</p></div><a href="/system-guide.html">システムについて →</a></div></section>`;

function insertAfterHero(html, block) {
  const hero = html.match(/<section\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  if (!hero || hero.index == null) return html;
  const at = hero.index + hero[0].length;
  return html.slice(0, at) + block + html.slice(at);
}
function normalizeGuide(html) {
  if (!html.includes('system-guide-teaser')) return html;
  return html.replace(/(<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<h2)[^>]*>[\s\S]*?<\/h2>/i, '$1>そのまま運営。カスタマイズも自由。</h2>')
    .replace(/(<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<p)[^>]*>[\s\S]*?<\/p>/i, '$1>完成された動画販売システムとして、このまま動画販売サイトを運営することも可能。さらに、ロゴ・サイト名・カラー・画像・カテゴリー・メニュー・コンテンツ・デザインまで、あなたのブランドやビジネスに合わせて自由にカスタマイズできます。</p>');
}
function finalize(html) {
  html = normalizeGuide(html);
  if (!html.includes('/system-guide.html')) {
    html = html.replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/i, m => m.replace(/<\/nav>/i, '<a href="/system-guide.html" class="system-guide-nav">システムについて</a></nav>'));
  }
  const feature = html.match(/<section\b[^>]*class=["'][^"']*\bsystem-showcase\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  if (feature) {
    html = html.replace(feature[0], '');
    html = insertAfterHero(html, feature[0]);
  }
  const guide = html.match(/<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  if (guide) {
    html = html.replace(guide[0], '');
    const featureAgain = html.match(/<section\b[^>]*class=["'][^"']*\bsystem-showcase\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
    if (featureAgain && featureAgain.index != null) {
      const at = featureAgain.index + featureAgain[0].length;
      html = html.slice(0, at) + guide[0] + html.slice(at);
    } else {
      html = insertAfterHero(html, guide[0]);
    }
  }
  return html.replace('</head>', `${HERO_STYLE}${GUIDE_STYLE}</head>`);
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/system-guide.html') {
    try { const html = await readFile(join(ROOT, 'system-guide.html'), 'utf8'); res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'}); res.end(html); } catch { res.writeHead(404); res.end('system guide unavailable'); }
    return;
  }
  const proxyReq = httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers}, proxyRes => {
    const type = String(proxyRes.headers['content-type'] || '');
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html')) && type.includes('text/html')) {
      const chunks=[]; proxyRes.on('data', c => chunks.push(c)); proxyRes.on('end', () => { const html=finalize(Buffer.concat(chunks).toString('utf8')); const headers={...proxyRes.headers,'content-length':Buffer.byteLength(html),'cache-control':'no-store'}; delete headers['transfer-encoding']; res.writeHead(proxyRes.statusCode||200,headers); res.end(html); });
    } else { res.writeHead(proxyRes.statusCode||200,proxyRes.headers); proxyRes.pipe(res); }
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('upstream error'); }); req.pipe(proxyReq);
});
server.listen(publicPort,'0.0.0.0');
