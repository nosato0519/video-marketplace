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
      if (text === '販売者デモ') a.onclick = e => { e.preventDefault(); go('/pages/creator-studio.html'); };
      if (text === '購入者デモ') a.onclick = e => { e.preventDefault(); go('/pages/library.html'); };
    });
    document.querySelectorAll('.login-dropdown button').forEach(b => b.onclick = e => { e.preventDefault(); go('/pages/login.html'); });
  }

  if (path === '/pages/video-list.html') {
    const grid = document.querySelector('.grid');
    const input = document.querySelector('.search input');
    const searchButton = document.querySelector('.search button');
    const filters = [...document.querySelectorAll('.filter')];
    const sort = document.querySelector('.sort');
    const more = document.querySelector('.more');
    const cards = grid ? [...grid.querySelectorAll('.card')] : [];
    const categoryMap = {'映像作品':'FILM','教育':'EDUCATION','ビジネス':'BUSINESS','クリエイティブ':'CREATIVE','ライフスタイル':'LIFESTYLE','音楽':'MUSIC','アダルト':'ADULT'};
    let activeCategory = '';
    const apply = () => {
      const q = (input?.value || '').trim().toLowerCase();
      cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        const cat = card.querySelector('.cat')?.textContent.trim() || '';
        const matchQ = !q || text.includes(q);
        const matchCat = !activeCategory || cat === activeCategory;
        card.style.display = matchQ && matchCat ? '' : 'none';
      });
    };
    searchButton?.addEventListener('click', apply);
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') apply(); });
    filters.forEach(f => f.addEventListener('click', () => {
      filters.forEach(x => x.classList.remove('active'));
      f.classList.add('active');
      activeCategory = categoryMap[f.textContent.trim()] || '';
      apply();
    }));
    sort?.addEventListener('change', () => {
      const mode = sort.value;
      const value = c => c.querySelector('.price')?.textContent.replace(/[^0-9]/g,'') * 1 || 0;
      const rating = c => parseFloat(c.querySelector('.meta')?.textContent.match(/([0-9.]+)/)?.[1] || '0');
      const title = c => c.querySelector('.title')?.textContent.trim() || '';
      const ordered = [...cards].sort((a,b) => mode === '価格の安い順' ? value(a)-value(b) : mode === '評価の高い順' ? rating(b)-rating(a) : mode === '新着順' ? (b.querySelector('.badge')?.textContent === 'NEW')-(a.querySelector('.badge')?.textContent === 'NEW') : title(a).localeCompare(title(b)));
      ordered.forEach(c => grid.appendChild(c));
    });
    cards.forEach(card => card.addEventListener('click', () => go('/pages/product-detail.html')));
    more?.addEventListener('click', () => alert('デモ版では代表6作品を表示しています。'));
  }

  if (path === '/pages/creator-studio.html') {
    document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => alert('デモ版のため、この操作は画面上の演出のみです。')));
  }
  if (path === '/pages/admin.html') {
    document.querySelectorAll('button').forEach(b => b.addEventListener('click', () => alert('デモ版のため、この操作は画面上の演出のみです。')));
  }
  if (path === '/pages/account.html' || path === '/pages/login.html' || path === '/pages/register.html') {
    document.querySelectorAll('button').forEach(b => {
      if (!b.closest('.login-dropdown')) b.addEventListener('click', () => alert('デモ版のため、実際の認証処理は行いません。'));
    });
  }
})();
</script>`;

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
  const videos = html.match(/<section\b[^>]*id=["']videos["'][^>]*>/i) || html.match(/<section\b[^>]*class=["'][^"']*\btrustbar\b[^"']*["'][^>]*>/i);
  if (!videos || videos.index == null) throw new Error('homepage insertion boundary not found');
  const at = videos.index;
  html = html.slice(0, at) + SYSTEM_BLOCK + html.slice(at);
  html = repairHomepageMarkup(html);
  return html.replace('</head>', STYLE + '</head>').replace('</body>', DEMO_FUNCTION_SCRIPT + '</body>');
}

function servePage(pathname, res) {
  const allowed = new Set(['/pages/video-list.html','/pages/product-detail.html','/pages/checkout.html','/pages/library.html','/pages/watch.html','/pages/creator-studio.html','/pages/admin.html','/pages/login.html','/pages/register.html','/pages/account.html','/pages/orders.html','/pages/error.html']);
  if (!allowed.has(pathname)) return false;
  readFile(join(ROOT, pathname.slice(1)), 'utf8').then(html => {
    html = html.replace('</head>', COMMON_PAGE_STYLE + '</head>').replace('</body>', DEMO_FUNCTION_SCRIPT + '</body>');
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
