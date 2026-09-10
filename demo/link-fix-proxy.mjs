import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';

const ROOT = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 10000);
const upstreamPort = 4175;

// force-page is the canonical demo-page server: it preserves the finished
// homepage while also serving every child page under /pages/*.html.
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
  const go = target => window.location.assign(target);
  const textOf = el => (el?.textContent || '').replace(/\s+/g, ' ').trim();
  const path = () => location.pathname.replace(/\/$/, '') || '/';

  document.addEventListener('click', event => {
    const el = event.target?.closest?.('a,button,[role="button"]');
    if (!el) return;
    const text = textOf(el);
    const current = path();

    if (el.classList?.contains('logo') || text === '← TOP') {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.home); return;
    }
    if (current === '/' || current === '/index.html') {
      if (el.closest('.mosaic-card, .video-card, .video-item, [data-video-id]')) { event.preventDefault(); event.stopImmediatePropagation(); go(routes.detail); return; }
      if (text === '販売者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
      if (text === '購入者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.library); return; }
      if (text.includes('動画を探す') || text.includes('人気の動画')) { event.preventDefault(); event.stopImmediatePropagation(); go(routes.list); return; }
      if (text.includes('クリエイターになる')) { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
      if (text === '販売者ログイン' || text === '購入者ログイン' || text === 'ログイン') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.login); return; }
      if (text === 'クリエイター') { event.preventDefault(); event.stopImmediatePropagation(); go(routes.creator); return; }
    }
    if (current === routes.list && el.closest('.card')) {
      event.preventDefault(); event.stopImmediatePropagation(); go(routes.detail); return;
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
    if (current === routes.login && (text.includes('新規') || text.includes('登録'))) {
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

function wireHomepageMarkup(html) {
  if (!html.includes('<header class="nav">')) return html;
  return html
    .replace('href="#search"', 'href="/pages/video-list.html"')
    .replace('href="#creators"', 'href="/pages/creator-studio.html"')
    .replace('href="#videos"', 'href="/pages/video-list.html"')
    .replace('href="#creator"', 'href="/pages/creator-studio.html"')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>販売者デモ<\/a>/, '<a class="system" href="/pages/creator-studio.html">販売者デモ</a>')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>購入者デモ<\/a>/, '<a class="system" href="/pages/video-list.html">購入者デモ</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*販売者ログイン<\/button>/, '<a href="/pages/login.html?role=seller">販売者ログイン</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*購入者ログイン\s*<\/button>/, '<a href="/pages/login.html?role=buyer">購入者ログイン</a>');
}

function injectNavigation(html) {
  html = wireHomepageMarkup(html);
  if (!html.includes('</body>') || html.includes('site-navigation-integration')) return html;
  return html.replace('</body>', `${NAV_SCRIPT}</body>`);
}

async function serveLegalPage(pathname, res) {
  if (pathname !== '/pages/legal.html' && pathname !== '/pages/privacy.html') return false;
  try {
    const html = await readFile(join(ROOT, pathname.slice(1)), 'utf8');
    const body = Buffer.from(injectNavigation(html), 'utf8');
    res.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'content-length': String(body.length),
      'cache-control': 'no-store'
    });
    res.end(body);
  } catch (error) {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Legal page unavailable: ${error.message}`);
  }
  return true;
}

function proxy(req, res) {
  serveLegalPage(req.url.split('?')[0], res).then(served => {
    if (served) return;
    const upstream = httpRequest({
      hostname: '127.0.0.1', port: upstreamPort, path: req.url,
      method: req.method, headers: req.headers
    }, upstream => {
      const chunks = [];
      upstream.on('data', chunk => chunks.push(chunk));
      upstream.on('end', () => {
        let body = Buffer.concat(chunks);
        const type = String(upstream.headers['content-type'] || '');
        if (type.includes('text/html')) body = Buffer.from(injectNavigation(body.toString('utf8')), 'utf8');
        const headers = { ...upstream.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
        delete headers['transfer-encoding'];
        res.writeHead(upstream.statusCode || 200, headers);
        res.end(body);
      });
    });
    upstream.on('error', err => {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
      res.end(`Upstream unavailable: ${err.message}`);
    });
    req.pipe(upstream);
  });
}

createServer(proxy).listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE navigation proxy listening on ${port}`);
});

const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
