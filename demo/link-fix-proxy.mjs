import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = 4174;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

function patchHomepage(html) {
  const patchAnchor = (source, label, target) => source.replace(
    new RegExp(`<a\\b([^>]*)>([\\s\\S]*?${label}[\\s\\S]*?)<\\/a>`, 'gi'),
    (_m, attrs, body) => {
      const cleanAttrs = attrs
        .replace(/\\s+onclick\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '')
        .replace(/\\s+href\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '');
      return `<a${cleanAttrs} href="${target}">${body}</a>`;
    }
  );

  html = patchAnchor(html, '販売者デモ', '/pages/creator-studio.html');
  html = patchAnchor(html, '購入者デモ', '/pages/library.html');
  return html;
}

const NAV_SCRIPT = `<script id="site-navigation-integration">
(() => {
  const go = target => { window.location.assign(target); };
  const textOf = el => (el?.textContent || '').replace(/\\s+/g, ' ').trim();

  document.addEventListener('click', event => {
    const el = event.target?.closest?.('a,button');
    if (!el) return;
    const text = textOf(el);
    const path = location.pathname;

    // Homepage: route the primary marketplace/demo entry points without changing markup or CSS.
    if (path === '/' || path === '/index.html') {
      if (text === '販売者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/creator-studio.html'); return; }
      if (text === '購入者デモ') { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/library.html'); return; }
      if (text.includes('動画を探す')) { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/video-list.html'); return; }
      if (text.includes('クリエイターになる')) { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/creator-studio.html'); return; }
      if (text === '販売者ログイン' || text === '購入者ログイン') { event.preventDefault(); event.stopImmediatePropagation(); go('/pages/login.html'); return; }
    }

    // Video discovery -> product detail.
    if (path === '/pages/video-list.html' && el.closest('.card')) {
      event.preventDefault(); event.stopImmediatePropagation(); go('/pages/product-detail.html'); return;
    }

    // Product detail -> checkout. Keep the existing explicit href working as-is, but make the click deterministic.
    if (path === '/pages/product-detail.html' && text.includes('この動画を購入する')) {
      event.preventDefault(); event.stopImmediatePropagation(); go('/pages/checkout.html'); return;
    }

    // Library -> dedicated watch page.
    if (path === '/pages/library.html' && (text === '視聴する' || el.closest('.play'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go('/pages/watch.html'); return;
    }

    // Account -> order history.
    if (path === '/pages/account.html' && text.includes('購入履歴を見る')) {
      event.preventDefault(); event.stopImmediatePropagation(); go('/pages/orders.html'); return;
    }

    // Orders -> watch page for a purchased item.
    if (path === '/pages/orders.html' && (text.includes('視聴') || text.includes('見る'))) {
      event.preventDefault(); event.stopImmediatePropagation(); go('/pages/watch.html'); return;
    }
  }, true);
})();
</script>`;

function injectNavigation(html) {
  if (!/<\\/body>/i.test(html) || html.includes('site-navigation-integration')) return html;
  return html.replace(/<\\/body>/i, `${NAV_SCRIPT}</body>`);
}

function proxy(req, res) {
  const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, upstream => {
    const chunks = [];
    upstream.on('data', chunk => chunks.push(chunk));
    upstream.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(upstream.headers['content-type'] || '');
      if ((req.url === '/' || req.url === '/index.html') && type.includes('text/html')) {
        body = Buffer.from(patchHomepage(body.toString('utf8')), 'utf8');
      }
      if (type.includes('text/html')) {
        body = Buffer.from(injectNavigation(body.toString('utf8')), 'utf8');
      }
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
}

createServer(proxy).listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE link-fix proxy listening on http://0.0.0.0:${port}`);
});

const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
