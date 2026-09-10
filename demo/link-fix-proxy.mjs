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
  const textOf = el => (el?.textContent || '').replace(/\\s+/g, ' ').trim();
  const path = () => location.pathname.replace(/\\/$/, '') || '/';
  const productIdForCard = el => {
    const card = el.closest('.card,.video-card,.video-item,[data-video-id],.mini,.mosaic-card');
    if (!card) return '1';
    if (card.dataset?.videoId) return String(card.dataset.videoId);

    const popularSection = card.closest('#popular');
    if (popularSection) {
      const cards = [...popularSection.querySelectorAll('.card,.video-card,.video-item,[data-video-id],.mini')];
      const index = cards.indexOf(card);
      if (index >= 0) return String((index % 6) + 1);
    }

    const newSection = card.closest('#new-releases');
    if (newSection) {
      const cards = [...newSection.querySelectorAll('.card,.video-card,.video-item,[data-video-id],.mini')];
      const index = cards.indexOf(card);
      if (index >= 0) return String((index % 6) + 1);
    }

    const cards = [...document.querySelectorAll('.card,.video-card,.video-item,[data-video-id],.mini,.mosaic-card')];
    const index = cards.indexOf(card);
    return String(index >= 0 ? (index % 6) + 1 : 1);
  };

  document.addEventListener('click', event => {
    const el = event.target?.closest?.('a,button,[role="button"],.cat,.card,.video-card,.mosaic-card');
    if (!el) return;
    const text = textOf(el);
    const current = path();

    if (el.classList?.contains('logo') || text === '← TOP') {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.home); return;
    }
    if (current === '/' || current === '/index.html') {
      const category = Object.keys(categoryRoutes).find(key => el.closest('.cat.' + key));
      if (category) {
        event.preventDefault(); event.stopImmediatePropagation(); go(categoryRoutes[category]); return;
      }
      if (el.closest('.mosaic-card, .card, .video-card, .video-item, [data-video-id], .mini')) {
        event.preventDefault(); event.stopImmediatePropagation(); go(routes.detail + '?product=' + productIdForCard(el)); return;
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
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.detail + '?product=' + productIdForCard(el)); return;
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
.new-releases-section { padding-top: 88px; padding-bottom: 88px; }
.new-releases-section .section-head { margin-bottom: 30px; }
.new-releases-section .new-badge { display:inline-flex; align-items:center; gap:8px; margin-bottom:12px; font-size:10px; letter-spacing:.18em; font-weight:700; color:var(--accent); }
.new-releases-section .new-badge i { width:6px; height:6px; border-radius:50%; background:currentColor; box-shadow:0 0 14px currentColor; }
.new-releases-section .video-card { cursor:pointer; }
</style>`;

const NEW_RELEASES_MARKUP = `<section class="section new-releases-section" id="new-releases">
  <div class="section-head">
    <div>
      <span class="new-badge"><i></i>NEW RELEASES</span>
      <h2>新着動画</h2>
    </div>
    <a href="/pages/video-list.html">すべて見る <b>→</b></a>
  </div>
  <div class="video-grid">
    <article class="video-card" data-video-id="6"><div class="thumb t6"><span class="quality">NEW</span><span class="duration">42:05</span><button>▶</button></div><div class="card-info"><span class="category">ライフスタイル</span><h3>Mountain Silence</h3><p>静かな山の時間を切り取った映像作品。</p><div class="card-bottom"><span>by YAMA FILM ★ 4.8</span><b>¥1,200</b></div></div></article>
    <article class="video-card" data-video-id="1"><div class="thumb t1"><span class="quality">4K</span><span class="duration">78:14</span><button>▶</button></div><div class="card-info"><span class="category">教育</span><h3>Creator Masterclass</h3><p>作品づくりから販売までを体系的に学ぶ。</p><div class="card-bottom"><span>by Nova Studio ★ 4.9</span><b>¥2,980</b></div></div></article>
    <article class="video-card" data-video-id="2"><div class="thumb t2"><span class="quality">4K</span><span class="duration">52:08</span><button>▶</button></div><div class="card-info"><span class="category">映像作品</span><h3>Cinematic Travel Pack</h3><p>旅の映像を美しく仕上げる撮影と編集。</p><div class="card-bottom"><span>by Luma Collective ★ 4.8</span><b>¥2,280</b></div></div></article>
    <article class="video-card" data-video-id="3"><div class="thumb t3"><span class="quality">1080P</span><span class="duration">96:20</span><button>▶</button></div><div class="card-info"><span class="category">ビジネス</span><h3>Build Your Digital Product</h3><p>アイデアをデジタル商品へ変える実践ガイド。</p><div class="card-bottom"><span>by Alex Rivera ★ 5.0</span><b>¥3,480</b></div></div></article>
    <article class="video-card" data-video-id="4"><div class="thumb t4"><span class="quality">4K</span><span class="duration">41:22</span><button>▶</button></div><div class="card-info"><span class="category">クリエイティブ</span><h3>Motion Design Toolkit</h3><p>モーションデザインの制作フローを実践。</p><div class="card-bottom"><span>by Mika Chen ★ 4.7</span><b>¥1,780</b></div></div></article>
    <article class="video-card" data-video-id="5"><div class="thumb t5"><span class="quality">COURSE</span><span class="duration">64:12</span><button>▶</button></div><div class="card-info"><span class="category">ラーニング</span><h3>Designing Ideas</h3><p>アイデアを整理し、伝わる形へデザインする。</p><div class="card-bottom"><span>by Frame Lab ★ 4.9</span><b>¥2,480</b></div></div></article>
  </div>
</section>`;

function wireHomepageMarkup(html) {
  if (!html.includes('<header class="nav">')) return html;
  let wired = html
    .replace('href="#search"', 'href="/pages/video-list.html"')
    .replace('href="#creators"', 'href="/pages/creator-studio.html"')
    .replace('href="#videos"', 'href="/pages/video-list.html"')
    .replace('href="#creator"', 'href="/pages/creator-studio.html"')
    .replace(/<a class="system"[^>]*>\s*販売者デモ\s*<\/a>/i, '<a class="system" href="/pages/creator-studio.html">販売者デモ</a>')
    .replace(/<a class="system"[^>]*>\s*購入者デモ\s*<\/a>/i, '<a class="system" href="/pages/video-list.html">購入者デモ</a>')
    .replace(/<button[^>]*>\s*販売者ログイン\s*<\/button>/i, '<a href="/pages/seller-login.html">販売者ログイン</a>')
    .replace(/<button[^>]*>\s*購入者ログイン\s*<\/button>/i, '<a href="/pages/buyer-login.html">購入者ログイン</a>')
    .replace(/(<a\s+class="[^"]*\bcat\s+c1\b[^"]*")([^>]*>)/i, '$1 href="/pages/video-list.html?category=education"$2')
    .replace(/(<a\s+class="[^"]*\bcat\s+c2\b[^"]*")([^>]*>)/i, '$1 href="/pages/video-list.html?category=business"$2')
    .replace(/(<a\s+class="[^"]*\bcat\s+c3\b[^"]*")([^>]*>)/i, '$1 href="/pages/video-list.html?category=creative"$2')
    .replace(/(<a\s+class="[^"]*\bcat\s+c4\b[^"]*")([^>]*>)/i, '$1 href="/pages/video-list.html?category=documentary"$2')
    .replace(/(<a\s+class="[^"]*\bcat\s+c5\b[^"]*")([^>]*>)/i, '$1 href="/pages/video-list.html?category=lifestyle"$2');

  if (wired.includes('id="new-releases"')) return wired;

  const markers = [
    '<section class="platform">',
    '<section class="section platform">',
    '<section class="section" id="popular">'
  ];
  for (const marker of markers) {
    if (wired.includes(marker)) {
      return wired.replace(marker, `${NEW_RELEASES_MARKUP}\n      ${marker}`);
    }
  }

  const mainEnd = wired.lastIndexOf('</main>');
  if (mainEnd >= 0) {
    return wired.slice(0, mainEnd) + NEW_RELEASES_MARKUP + '\n    ' + wired.slice(mainEnd);
  }
  return wired;
}

function injectNavigation(html) {
  const isHomepage = /<header class="nav">/.test(html);
  if (isHomepage) {
    html = html.replace(/<script id="demo-function-integration">[\s\S]*?<\/script>/gi, '');
  }
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
