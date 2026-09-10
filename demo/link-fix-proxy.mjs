import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const ROOT = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);
const upstreamPort = 4175;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const NAV_SCRIPT = `<script id="site-navigation-integration">
(() => {
  const routes = {
    home: '/', list: '/pages/video-list.html', detail: '/pages/product-detail.html',
    checkout: '/pages/checkout.html', library: '/pages/library.html', watch: '/pages/watch.html',
    creator: '/pages/creator-studio.html', admin: '/pages/admin.html', login: '/pages/login.html',
    register: '/pages/register.html', account: '/pages/account.html', orders: '/pages/orders.html'
  };
  const categoryRoutes = {
    c1: '/pages/video-list.html?category=education',
    c2: '/pages/video-list.html?category=business',
    c3: '/pages/video-list.html?category=creative',
    c4: '/pages/video-list.html?category=documentary',
    c5: '/pages/video-list.html?category=lifestyle'
  };
  const go = target => window.location.assign(target);
  const textOf = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const path = () => location.pathname.replace(/\/$/, '') || '/';
  const productIdForCard = el => {
    const card = el.closest('.card,.video-card,.video-item,[data-video-id],.mini');
    if (!card) return '1';
    const cards = [...document.querySelectorAll('.card,.video-card,.video-item,[data-video-id],.mini')].filter(x => !x.closest('.mosaic-card'));
    const index = cards.indexOf(card);
    return String(index >= 0 ? (index % 6) + 1 : 1);
  };

  document.addEventListener('click', event => {
    const el = event.target?.closest?.('a,button,[role="button"],.cat,.video-card,.mosaic-card');
    if (!el) return;
    const text = textOf(el);
    const current = path();

    if (el.classList?.contains('logo') || text === '← TOP') {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.home); return;
    }
    if (current === '/' || current === '/index.html') {
      const categoryCard = el.closest('.category-grid > *');
      const category = categoryCard ? Object.keys(categoryRoutes).find(key => categoryCard.classList.contains(key)) : null;
      if (category) {
        event.preventDefault(); event.stopImmediatePropagation(); go(categoryRoutes[category]); return;
      }
      if (el.closest('.mosaic-card, .video-card, .video-item, [data-video-id], .mini')) {
        event.preventDefault(); event.stopImmediatePropagation(); go(`${routes.detail}?product=${productIdForCard(el)}`); return;
      }
      if (text === '販売者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
      if (text === '購入者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.list); return; }
      if (text.includes('動画を探す') || text.includes('人気の動画')) { event.preventDefault(); event.stopImmediatePropagation(); go(routes.list); return; }
      if (text.includes('クリエイターになる')) { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
      if (text === '販売者ログイン') { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/seller-login.html'); return; }
      if (text === '購入者ログイン') { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/buyer-login.html'); return; }
      if (text === 'ログイン') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.login); return; }
      if (text === 'クリエイター') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
    }
    if (current === routes.list && el.closest('.card')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(`${routes.detail}?product=${productIdForCard(el)}`); return;
    }
    if (current === routes.detail && text.includes('この動画を購入する')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.checkout); return;
    }
    if (current === routes.checkout && text.includes('商品詳細')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.detail); return;
    }
    if (current === routes.library && (text === '視聴する' || el.closest('.play'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.watch); return;
    }
    if (current === routes.watch && (text.includes('ライブラリへ') || text.includes('マイライブラリ'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.library); return;
    }
    if (current === routes.account && text.includes('購入履歴を見る')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.orders); return;
    }
    if (current === routes.account && text.includes('ログイン画面')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.login); return;
    }
    if (current === routes.orders && (text.includes('視聴') || text.includes('見る'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.watch); return;
    }
    if (current === routes.orders && text.includes('アカウント')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.account); return;
    }
    if ((current === routes.login || current === '/pages/seller-login.html' || current === '/pages/buyer-login.html') && (text.includes('新規') || text.includes('登録'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.register); return;
    }
    if (current === routes.register && text.includes('ログイン')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.login); return;
    }
    if (current === routes.admin && (text.includes('販売者') || text.includes('クリエイター'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return;
    }
  }, true);
})();
</script>`;

const HOMEPAGE_STYLE = `<style id="homepage-navigation-fixes">
.login-dropdown button, .login-dropdown a { display:block !important; width:100% !important; box-sizing:border-box !important; border:0 !important; outline:0 !important; background:transparent !important; color:#dfe4e9 !important; text-align:left !important; padding:10px 12px !important; margin:0 !important; border-radius:5px !important; font:inherit !important; font-size:11px !important; font-weight:400 !important; line-height:1.4 !important; cursor:pointer !important; white-space:nowrap !important; text-decoration:none !important; }
.login-dropdown button:hover, .login-dropdown a:hover { background:#ffffff0d !important; color:var(--accent) !important; text-decoration:none !important; }
.category-grid { display:grid; grid-template-columns:repeat(5,minmax(0,1fr)); grid-auto-rows:minmax(175px,auto); gap:12px; align-items:stretch; }
.category-grid .cat { position:relative; min-width:0; width:100%; height:175px; min-height:175px; box-sizing:border-box; cursor:pointer; }
.category-grid .cat i { position:absolute; right:20px; bottom:20px; z-index:2; font-style:normal; color:var(--accent); font-size:18px; line-height:1; }
@media (max-width:1100px) { .category-grid { grid-template-columns:repeat(3,minmax(0,1fr)); } }
@media (max-width:680px) { .category-grid { grid-template-columns:repeat(2,minmax(0,1fr)); grid-auto-rows:minmax(150px,auto); gap:10px; } .category-grid .cat { height:150px; min-height:150px; padding:16px; } .category-grid .cat i { right:16px; bottom:16px; } }
</style>`;

function wireHomepageMarkup(html) {
  if (!html.includes('<header class="nav">')) return html;
  return html
    .replace('href="#search"', 'href="/pages/video-list.html"')
    .replace('href="#creators"', 'href="/pages/creator-studio.html"')
    .replace('href="#videos"', 'href="/pages/video-list.html"')
    .replace('href="#creator"', 'href="/pages/creator-studio.html"')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>販売者デモ<\/a>/, '<a class="system" href="/pages/creator-studio.html">販売者デモ</a>')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>購入者デモ<\/a>/, '<a class="system" href="/pages/video-list.html">購入者デモ</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*販売者ログイン<\/button>/, '<a href="/pages/seller-login.html">販売者ログイン</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*購入者ログイン\s*<\/button>/, '<a href="/pages/buyer-login.html">購入者ログイン</a>')
    .replace(/(<a class="cat c1")\s+href="[^"]*"/, '$1 href="/pages/video-list.html?category=education"')
    .replace(/(<a class="cat c2")\s+href="[^"]*"/, '$1 href="/pages/video-list.html?category=business"')
    .replace(/(<a class="cat c3")\s+href="[^"]*"/, '$1 href="/pages/video-list.html?category=creative"')
    .replace(/(<a class="cat c4")\s+href="[^"]*"/, '$1 href="/pages/video-list.html?category=documentary"')
    .replace(/(<a class="cat c5")\s+href="[^"]*"/, '$1 href="/pages/video-list.html?category=lifestyle"');
}

function injectNavigation(html) {
  html = wireHomepageMarkup(html);
  if (html.includes('homepage-navigation-fixes')) return html;
  if (html.includes('</head>')) html = html.replace('</head>', `${HOMEPAGE_STYLE}</head>`);
  if (!html.includes('</body>') || html.includes('site-navigation-integration')) return html;
  return html.replace('</body>', `${NAV_SCRIPT}</body>`);
}

async function serveSpecialPage(pathname, res) {
  if (!['/pages/legal.html','/pages/privacy.html','/pages/seller-login.html','/pages/buyer-login.html'].includes(pathname)) return false;
  try {
    let source = pathname;
    if (pathname === '/pages/seller-login.html' || pathname === '/pages/buyer-login.html') source = '/pages/login.html';
    let html = await readFile(join(ROOT, source.slice(1)), 'utf8');
    if (pathname === '/pages/seller-login.html') {
      html = html.replace(/<title>.*?<\/title>/i, '<title>販売者ログイン | VIDEO MARKETPLACE</title>');
      html = html.replace(/<h1[^>]*>.*?<\/h1>/i, '<h1 class="title">販売者ログイン。</h1>');
      html = html.replace(/window\.location\.href='\/pages\/account\.html'/, "window.location.href='/pages/creator-studio.html'");
      html = html.replace(/購入した動画を楽しむ、または販売者として作品を届けるためのログイン画面です。/, '作品を登録・販売し、販売状況を管理するための販売者ログインです。');
    }
    if (pathname === '/pages/buyer-login.html') {
      html = html.replace(/<title>.*?<\/title>/i, '<title>購入者ログイン | VIDEO MARKETPLACE</title>');
      html = html.replace(/<h1[^>]*>.*?<\/h1>/i, '<h1 class="title">購入者ログイン。</h1>');
      html = html.replace(/window\.location\.href='\/pages\/account\.html'/, "window.location.href='/pages/library.html'");
      html = html.replace(/購入した動画を楽しむ、または販売者として作品を届けるためのログイン画面です。/, '購入した動画をライブラリで楽しむための購入者ログインです。');
    }
    const body = Buffer.from(injectNavigation(html), 'utf8');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','content-length':String(body.length),'cache-control':'no-store'});
    res.end(body);
  } catch (error) {
    res.writeHead(500, {'content-type':'text/plain; charset=utf-8'}); res.end(`Special page unavailable: ${error.message}`);
  }
  return true;
}

function proxy(req, res) {
  serveSpecialPage(req.url.split('?')[0], res).then(served => {
    if (served) return;
    const upstream = httpRequest({hostname:'127.0.0.1', port:upstreamPort, path:req.url, method:req.method, headers:req.headers}, upstream => {
      const chunks=[];
      upstream.on('data', chunk => chunks.push(chunk));
      upstream.on('end', () => {
        let body=Buffer.concat(chunks);
        const type=String(upstream.headers['content-type']||'');
        if (type.includes('text/html')) body=Buffer.from(injectNavigation(body.toString('utf8')),'utf8');
        const headers={...upstream.headers,'content-length':String(body.length),'cache-control':'no-store'};
        delete headers['transfer-encoding']; res.writeHead(upstream.statusCode||200,headers); res.end(body);
      });
    });
    upstream.on('error', err => { res.writeHead(502,{'content-type':'text/plain; charset=utf-8'}); res.end(`Upstream unavailable: ${err.message}`); });
    req.pipe(upstream);
  });
}

createServer(proxy).listen(port,'0.0.0.0',()=>console.log(`VIDEO MARKETPLACE navigation proxy listening on ${port}`));
const shutdown=()=>{child.kill('SIGTERM');process.exit(0)};
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
