import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;
const SYSTEM_BLOCK = await readFile(join(ROOT, 'system-block.html'), 'utf8');

spawn(process.execPath, ['launcher.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(upstreamPort) }, stdio: 'inherit' });

const STYLE = `<style id="force-final-visual">
.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{transform:scale(1.25)!important;transform-origin:top right!important}
.system-showcase-force{display:block!important;position:relative!important;background:linear-gradient(180deg,#090a0d 0%,#111216 100%);border-top:1px solid rgba(183,155,91,.38);border-bottom:1px solid #29282a;padding:86px 6vw 92px;color:#f4f1eb}.ssf-inner{max-width:1280px;margin:0 auto}.ssf-kicker{font-size:10px;letter-spacing:.28em;color:#c6a864;font-weight:800}.system-showcase-force h2{font-size:clamp(38px,4.6vw,64px);line-height:1.1;letter-spacing:-.04em;margin:14px 0 20px}.system-showcase-force h2 em{font-style:normal;color:#d5ba79}.ssf-lead{max-width:980px;color:#aaa6a0;font-size:15px;line-height:1.95;margin:0}.ssf-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:42px}.ssf-roles article{padding:32px;border:1px solid #3b3935;background:linear-gradient(145deg,#1a1a1d,#101114);min-height:265px}.ssf-roles b{font-size:10px;letter-spacing:.2em;color:#c6a864}.ssf-roles strong{display:block;font-size:24px;line-height:1.35;margin:14px 0}.ssf-roles p{color:#aaa6a0;font-size:13px;line-height:1.85;margin:0}.ssf-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}.ssf-tags span{font-size:10px;padding:7px 10px;border:1px solid #45434a;color:#ddd7cc;background:#111216}.ssf-detail-title{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-top:62px;padding-bottom:18px;border-bottom:1px solid #343238}.ssf-detail-title span{font-size:10px;letter-spacing:.24em;color:#c6a864;font-weight:800}.ssf-detail-title strong{font-size:22px}.ssf-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}.ssf-grid article{min-height:225px;padding:28px;border:1px solid #343238;background:linear-gradient(145deg,#16171b,#0e0f12);display:flex;flex-direction:column}.ssf-grid b{font-size:10px;letter-spacing:.2em;color:#b79b5b}.ssf-grid strong{font-size:20px;margin:13px 0 12px}.ssf-grid span{color:#99958f;font-size:12px;line-height:1.9}.ssf-bottom{margin-top:28px;padding:27px 30px;border:1px solid rgba(183,155,91,.45);background:linear-gradient(120deg,#18150f,#101114);display:flex;justify-content:space-between;gap:30px;align-items:center}.ssf-bottom>div:first-child{flex:1}.ssf-bottom strong{display:block;font-size:22px}.ssf-bottom span{display:block;max-width:760px;color:#aaa6a0;font-size:12px;line-height:1.8;margin-top:8px}.ssf-badge{min-width:245px;text-align:center;padding:16px 18px;border:1px solid rgba(198,168,100,.5);background:#0d0e11}.ssf-badge b{display:block;font-size:10px;letter-spacing:.18em;color:#c6a864}.ssf-badge small{display:block;margin-top:7px;color:#ddd7cc;font-size:11px}
@media(max-width:1100px){.ssf-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.hero{height:720px!important;min-height:720px!important}.ssf-roles{grid-template-columns:1fr}.ssf-detail-title{display:block}.ssf-detail-title strong{display:block;margin-top:10px}.ssf-bottom{display:block}.ssf-badge{margin-top:20px;max-width:320px}.ssf-bottom span{max-width:none}}@media(max-width:600px){.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1)!important}.hero-mosaic{transform:scale(.9)!important}.system-showcase-force{padding:65px 20px}.ssf-grid{grid-template-columns:1fr}.system-showcase-force h2{font-size:36px}.ssf-roles article{padding:25px}.ssf-detail-title strong{font-size:19px}.ssf-bottom{padding:24px}.ssf-badge{min-width:0;width:100%}}
</style>`;

function repairHomepageMarkup(html) {
  for (let n = 3; n <= 9; n++) {
    const re = new RegExp(`(<div class="thumb t${n}"[\\s\\S]*?<div class="card-info">[\\s\\S]*?<div class="card-bottom">[\\s\\S]*?</div>)(</article>)`, 'i');
    html = html.replace(re, '$1</div>$2');
  }
  html = html.replace(/<a href=["']#["'][^>]*>ログイン<\/a>/gi, '<a href="#" onclick="event.preventDefault();loginModal()">ログイン</a>');
  html = html.replace(/<a class="primary" href=["']#["'][^>]*>マイライブラリを見る →<\/a>/gi, '<a class="primary" href="#" onclick="event.preventDefault();showBuyer()">マイライブラリを見る →</a>');
  html = html.replace(/<a class="primary" href=["']#["'][^>]*>販売を始める →<\/a>/gi, '<a class="primary" href="#" onclick="event.preventDefault();showSeller()">販売を始める →</a>');
  return html;
}

function finalize(html) {
  html = html.replaceAll('VIDORA', 'VIDEO MARKETPLACE');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-showcase\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<section\b[^>]*id=["']guide["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/href=["']#guide["']/gi, 'href="#system-features-force"');
  const videos = html.match(/<section\b[^>]*id=["']videos["'][^>]*>/i);
  if (!videos || videos.index == null) throw new Error('videos boundary not found');
  const at = videos.index;
  html = html.slice(0, at) + SYSTEM_BLOCK + html.slice(at);
  html = repairHomepageMarkup(html);
  return html.replace('</head>', STYLE + '</head>');
}

function servePage(pathname, res) {
  const allowed = new Set(['/pages/video-list.html','/pages/product-detail.html','/pages/checkout.html','/pages/library.html','/pages/watch.html','/pages/creator-studio.html','/pages/admin.html']);
  if (!allowed.has(pathname)) return false;
  readFile(join(ROOT, pathname.slice(1)), 'utf8').then(html => {
    const body = Buffer.from(html, 'utf8');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':body.length,'cache-control':'no-store'});
    res.end(body);
  }).catch(err => {
    res.writeHead(500, {'content-type':'text/plain; charset=utf-8'});
    res.end(`Page error: ${err.message}`);
  });
  return true;
}

function proxy(req, res) {
  if (servePage(req.url.split('?')[0], res)) return;
  const upstream = httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers}, (upstreamRes) => {
    const chunks = [];
    upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const isHome = req.method === 'GET' && (req.url === '/' || req.url === '/index.html');
      if (isHome && String(upstreamRes.headers['content-type'] || '').includes('text/html')) {
        const html = finalize(body.toString('utf8'));
        const headers = {...upstreamRes.headers,'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(html),'cache-control':'no-store','x-demo-version':'20260907-v35'};
        delete headers['transfer-encoding'];
        res.writeHead(upstreamRes.statusCode || 200, headers); res.end(html);
      } else { res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers); res.end(body); }
    });
  });
  upstream.on('error', err => { res.statusCode=502; res.end(`Upstream error: ${err.message}`); });
  req.pipe(upstream);
}

createServer(proxy).listen(port,'0.0.0.0',() => console.log(`VIDEO MARKETPLACE force-page listening on http://0.0.0.0:${port}`));
