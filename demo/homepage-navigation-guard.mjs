import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

const child = spawn(process.execPath, ['homepage-order-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const HOMEPAGE_GUARD = `<script id="homepage-navigation-guard">
(() => {
  const routes = {
    sellerDemo: '/pages/creator-studio.html',
    buyerDemo: '/pages/video-list.html',
    login: '/pages/login.html'
  };

  const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();

  const repair = root => {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('a,button').forEach(el => {
      const text = normalize(el.textContent);
      if (text === '販売者デモ') {
        el.setAttribute('href', routes.sellerDemo);
        el.removeAttribute('onclick');
        el.dataset.demoRoute = routes.sellerDemo;
      } else if (text === '購入者デモ') {
        el.setAttribute('href', routes.buyerDemo);
        el.removeAttribute('onclick');
        el.dataset.demoRoute = routes.buyerDemo;
      } else if (text === '販売者ログイン' || text === '購入者ログイン') {
        el.dataset.demoRoute = routes.login;
        el.removeAttribute('onclick');
        if (el.tagName === 'BUTTON') el.type = 'button';
      }
    });
  };

  const go = route => { window.location.assign(route); };

  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target.closest('a,button') : null;
    if (!target) return;
    const route = target.dataset.demoRoute;
    if (!route) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(route);
  }, true);

  const boot = () => {
    repair(document);
    const observer = new MutationObserver(() => repair(document));
    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
</script>`;

const server = createServer((req, res) => {
  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let body = Buffer.concat(chunks);
      const pathname = (req.url || '/').split('?')[0];
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html') && type.includes('text/html')) {
        let html = body.toString('utf8');
        if (html.includes('</head>')) html = html.replace('</head>', `${HOMEPAGE_GUARD}</head>`);
        else if (html.includes('</body>')) html = html.replace('</body>', `${HOMEPAGE_GUARD}</body>`);
        body = Buffer.from(html, 'utf8');
      }
      const headers = {
        ...response.headers,
        'content-length': String(body.length),
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        pragma: 'no-cache',
        expires: '0'
      };
      delete headers['transfer-encoding'];
      res.writeHead(response.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', error => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`Upstream unavailable: ${error.message}`);
  });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE homepage navigation guard listening on ${port}`));
const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
