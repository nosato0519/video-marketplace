import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const port = Number(process.env.PORT || 4173);
const upstreamPort = port + 1;

spawn(process.execPath, ['launcher.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(upstreamPort) }, stdio: 'inherit' });

const STYLE = `<style id="force-final-visual">
.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{transform:scale(1.25)!important;transform-origin:top right!important}
@media(max-width:900px){.hero{height:720px!important;min-height:720px!important}}@media(max-width:600px){.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1)!important}.hero-mosaic{transform:scale(.9)!important}}
</style>`;

const COMMON_PAGE_STYLE = `<style id="common-page-polish">
:root{color-scheme:dark}
body{background:radial-gradient(circle at 50% -10%,rgba(198,168,100,.055),transparent 34%),#08090b!important;color:#f4f1eb!important}
.top{background:rgba(8,9,11,.88)!important;backdrop-filter:blur(14px);box-shadow:0 1px 0 rgba(255,255,255,.025)!important}
.logo{color:#f4f1eb!important;letter-spacing:.2em!important}
.back{transition:color .25s ease,transform .25s ease!important}.back:hover{color:#d9b45f!important;transform:translateX(-2px)}
.btn,button{font-family:inherit!important;cursor:pointer!important;transition:transform .22s ease,box-shadow .22s ease,background .22s ease!important}
.btn:hover,button:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.32)!important}
input,select,textarea{font-family:inherit!important;border-radius:0!important}
.card,.panel,.shell,.content-card{box-shadow:0 28px 80px rgba(0,0,0,.28),inset 0 1px 0 rgba(255,255,255,.025)!important}
</style>`;

const DEMO_FUNCTION_SCRIPT = `<script id="demo-function-integration">
(() => {
  const path = location.pathname;
  const go = p => { location.href = p; };
  if (path === '/') {
    document.querySelectorAll('a').forEach(a => {
      const text = (a.textContent || '').trim();
      if (text.includes('動画を探す')) a.onclick = e => { e.preventDefault(); go('/pages/video-list.html'); };
      if (text.includes('クリエイターになる')) a.onclick = e => { e.preventDefault(); go('/pages/creator-studio.html'); };
      if (text === '販売者デモ') { a.href = '/pages/creator-studio.html'; a.onclick = e => { e.preventDefault(); go('/pages/creator-studio.html'); }; }
      if (text === '購入者デモ') { a.href = '/pages/account.html'; a.onclick = e => { e.preventDefault(); go('/pages/account.html'); }; }
    });
    document.querySelectorAll('.login-dropdown button').forEach(b => {
      const text = (b.textContent || '').trim();
      const target = text === '販売者ログイン' ? '/pages/login.html?role=seller' : text === '購入者ログイン' ? '/pages/login.html?role=buyer' : '/pages/login.html';
      b.onclick = e => { e.preventDefault(); go(target); };
    });
  }
  if (path === '/pages/creator-studio.html') document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => alert('デモ版のため、この操作は画面上の演出のみです。')));
  if (path === '/pages/admin.html') document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => alert('デモ版のため、この操作は画面上の演出のみです。')));
  if (path === '/pages/account.html' || path === '/pages/login.html' || path === '/pages/register.html') document.querySelectorAll('button').forEach(b => { if (!b.closest('.login-dropdown')) b.addEventListener('click', () => alert('デモ版のため、実際の認証処理は行いません。')); });
})();
</script>`;

function repairHomepageMarkup(html) {
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
  return repairHomepageMarkup(html)
    .replace('</head>', STYLE + '</head>')
    .replace('</body>', DEMO_FUNCTION_SCRIPT + '</body>');
}

function servePage(pathname, res) {
  const allowed = new Set(['/pages/video-list.html','/pages/product-detail.html','/pages/cart.html','/pages/checkout.html','/pages/library.html','/pages/watch.html','/pages/creator-studio.html','/pages/admin.html','/pages/login.html','/pages/register.html','/pages/account.html','/pages/orders.html','/pages/error.html','/pages/sales-history.html','/pages/product-edit.html']);
  if (!allowed.has(pathname)) return false;
  readFile(join(ROOT, pathname.slice(1)), 'utf8').then(html => {
    html = html.replace('</head>', COMMON_PAGE_STYLE + '</head>').replace('</body>', DEMO_FUNCTION_SCRIPT + '</body>');
    const body = Buffer.from(html, 'utf8');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':body.length,'cache-control':'no-store'});
    res.end(body);
  }).catch(err => { res.writeHead(500, {'content-type':'text/plain; charset=utf-8'}); res.end(`Page error: ${err.message}`); });
  return true;
}

function proxy(req, res) {
  if (servePage(req.url.split('?')[0], res)) return;
  const upstream = httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers}, (upstreamRes) => {
    const chunks = []; upstreamRes.on('data', c => chunks.push(c));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks), isHome = req.method === 'GET' && (req.url === '/' || req.url === '/index.html');
      if (isHome && String(upstreamRes.headers['content-type'] || '').includes('text/html')) {
        const html = finalize(body.toString('utf8'));
        const headers = {...upstreamRes.headers,'content-type':'text/html; charset=utf-8','content-length':Buffer.byteLength(html),'cache-control':'no-store','x-demo-version':'20260925-main-copy-base'};
        delete headers['transfer-encoding']; res.writeHead(upstreamRes.statusCode || 200, headers); res.end(html);
      } else { res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers); res.end(body); }
    });
  });
  upstream.on('error', err => { res.statusCode=502; res.end(`Upstream error: ${err.message}`); }); req.pipe(upstream);
}

createServer(proxy).listen(port,'0.0.0.0',() => console.log(`VIDEO MARKETPLACE force-page listening on http://0.0.0.0:${port}`));
