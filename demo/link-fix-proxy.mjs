import { createServer, request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const ROOT = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);
// The Playwright suite already owns the canonical static browser server on 4173.
// Starting force-page here would recursively spawn launcher.mjs onto that same
// port and leave this proxy returning 502s. Keep the navigation proxy focused on
// rewriting/validating navigation while reusing the existing browser server.
const upstreamPort = Number(process.env.NAVIGATION_UPSTREAM_PORT || 4173);

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

const PRODUCT_ID_BY_TITLE = {
  'Creator Masterclass': 1,
  'Cinematic Travel Pack': 2,
  'Build Your Digital Product': 3,
  'Motion Design Toolkit': 4,
  'Designing Ideas': 5,
  'Mountain Silence': 6,
  'THE LAST SIGNAL': 7,
  'Tokyo After Hours': 8,
};

const NAV_SCRIPT = `<script id="site-navigation-integration">(()=>{const r={
'販売者デモ':'/pages/creator-studio.html','購入者デモ':'/pages/video-list.html','動画を探す':'/pages/video-list.html','人気の動画':'/pages/video-list.html','クリエイターになる':'/pages/creator-studio.html','販売者ログイン':'/pages/seller-login.html','購入者ログイン':'/pages/buyer-login.html','ログイン':'/pages/login.html','アカウント':'/pages/account.html','注文履歴':'/pages/orders.html','ライブラリ':'/pages/library.html','管理画面':'/pages/admin.html','販売者管理':'/pages/creator-studio.html'};document.addEventListener('click',e=>{const el=e.target.closest('a,button');if(!el)return;const text=(el.textContent||'').replace(/\\s+/g,' ').trim();for(const[k,v]of Object.entries(r)){if(text===k){e.preventDefault();location.href=v;return}}const card=el.closest('.card');if(card){const title=card.querySelector('h3,h2,.card-title,.title');const id=card.dataset.productId||card.dataset.id||(title&&${JSON.stringify(PRODUCT_ID_BY_TITLE)}[title.textContent.trim()]);if(id){e.preventDefault();location.href='/pages/product-detail.html?id='+id;}}},{capture:true});})();</script>`;
const HOMEPAGE_STYLE = `<style id="navigation-homepage-style">.login-dropdown button,.login-dropdown a{display:block;width:100%;text-align:left;border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;text-decoration:none}</style>`;

function wireHomepageMarkup(html) {
  return html
    .replace(/href=["']#search["']/g, 'href="/pages/video-list.html"')
    .replace(/href=["']#creators["']/g, 'href="/pages/creator-studio.html"')
    .replace(/href=["']#videos["']/g, 'href="/pages/video-list.html"')
    .replace(/href=["']#creator["']/g, 'href="/pages/creator-studio.html"')
    .replace(/(<a[^>]*class=["'][^"']*system[^"']*["'][^>]*>)販売者デモ<\/a>/g, '$1販売者デモ</a>'.replace('</a>', ''));
}

function injectNavigation(html) {
  const isHomepage = /<header class="nav">/.test(html);
  if (!isHomepage) return html.includes('site-navigation-integration') ? html : html.replace('</body>', `${NAV_SCRIPT}</body>`);
  html = html.replace(/<script id="demo-function-integration">[\s\S]*?<\/script>/, '');
  html = html
    .replace(/href=["']#search["']/g, 'href="/pages/video-list.html"')
    .replace(/href=["']#creators["']/g, 'href="/pages/creator-studio.html"')
    .replace(/href=["']#videos["']/g, 'href="/pages/video-list.html"')
    .replace(/href=["']#creator["']/g, 'href="/pages/creator-studio.html"')
    .replace(/(<a class=["'][^"']*system[^"']*["'][^>]*>)[\s\S]*?販売者デモ([\s\S]*?<\/a>)/, '$1販売者デモ$2')
    .replace(/(<a class=["'][^"']*system[^"']*["'][^>]*>)[\s\S]*?購入者デモ([\s\S]*?<\/a>)/, '$1購入者デモ$2')
    .replace(/<button([^>]*?)>販売者ログイン<\/button>/g, '<a$1 href="/pages/seller-login.html">販売者ログイン</a>')
    .replace(/<button([^>]*?)>購入者ログイン<\/button>/g, '<a$1 href="/pages/buyer-login.html">購入者ログイン</a>');
  if (!html.includes('navigation-homepage-style')) html = html.replace('</head>', `${HOMEPAGE_STYLE}</head>`);
  if (!html.includes('site-navigation-integration')) html = html.replace('</body>', `${NAV_SCRIPT}</body>`);
  return html;
}

function injectProductDetail(html) {
  return html;
}

async function serveSpecialPage(pathname, res) {
  const special = new Set(['/pages/legal.html','/pages/privacy.html','/pages/seller-login.html','/pages/buyer-login.html']);
  if (!special.has(pathname)) return false;
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
  const pathname = req.url.split('?')[0];
  serveSpecialPage(pathname, res).then(served => {
    if (served) return;
    const upstream = httpRequest({hostname:'127.0.0.1', port:upstreamPort, path:req.url, method:req.method, headers:req.headers}, upstream => {
      const chunks=[];
      upstream.on('data', chunk => chunks.push(chunk));
      upstream.on('end', () => {
        let body=Buffer.concat(chunks);
        const type=String(upstream.headers['content-type']||'');
        if (type.includes('text/html')) {
          let html = body.toString('utf8');
          html = injectNavigation(html);
          if (pathname === '/pages/product-detail.html') html = injectProductDetail(html);
          body=Buffer.from(html,'utf8');
        }
        const headers={...upstream.headers,'content-length':String(body.length),'cache-control':'no-store'};
        delete headers['transfer-encoding']; res.writeHead(upstream.statusCode||200,headers); res.end(body);
      });
    });
    upstream.on('error', err => { res.writeHead(502,{'content-type':'text/plain; charset=utf-8'}); res.end(`Upstream unavailable: ${err.message}`); });
    req.pipe(upstream);
  });
}

createServer(proxy).listen(port,'0.0.0.0',()=>console.log(`VIDEO MARKETPLACE navigation proxy listening on ${port}`));
const shutdown=()=>process.exit(0);
process.on('SIGTERM',shutdown); process.on('SIGINT',shutdown);
