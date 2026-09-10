import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

spawn(process.execPath, ['safe-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

function takeSection(html, selector) {
  const start = html.search(selector);
  if (start < 0) return [html, ''];
  const end = html.indexOf('</section>', start);
  if (end < 0) return [html, ''];
  const section = html.slice(start, end + 10);
  return [html.slice(0, start) + html.slice(end + 10), section];
}

function reorderHomepage(html) {
  if (!/<section\b[^>]*id=["']popular["'][^>]*>/i.test(html)) return html;

  let working = html;
  let newReleases = '';
  let mood = '';
  let recommendations = '';

  [working, newReleases] = takeSection(working, /<section\b[^>]*class=["'][^"']*\bnew-releases-section\b[^"']*["'][^>]*>/i);
  [working, mood] = takeSection(working, /<section\b[^>]*class=["'][^"']*\bgenre-rail\b[^"']*["'][^>]*>/i);
  [working, recommendations] = takeSection(working, /<section\b[^>]*class=["'][^"']*\bgenre-recommendations\b[^"']*["'][^>]*>/i);

  if (!newReleases || !mood || !recommendations) return html;

  const popular = working.search(/<section\b[^>]*id=["']popular["'][^>]*>/i);
  if (popular < 0) return html;
  const popularEnd = working.indexOf('</section>', popular);
  if (popularEnd < 0) return html;

  const block = `\n${newReleases}\n${mood}\n${recommendations}\n`;
  return working.slice(0, popularEnd + 10) + block + working.slice(popularEnd + 10);
}

function repairHomepageNavigationMarkup(html) {
  html = html.replace(/(<a\b[^>]*class=["'][^"']*\bsystem\b[^"']*["'][^>]*)(?:\s+onclick=["'][^"']*["'])?([^>]*>\s*販売者デモ\s*<\/a>)/i,
    '$1 href="/pages/creator-studio.html"$2');
  html = html.replace(/(<a\b[^>]*class=["'][^"']*\bsystem\b[^"']*["'][^>]*)(?:\s+onclick=["'][^"']*["'])?([^>]*>\s*購入者デモ\s*<\/a>)/i,
    '$1 href="/pages/video-list.html"$2');
  html = html.replace(/(<button\b[^>]*type=["']button["'][^>]*)(?:\s+onclick=["'][^"']*["'])?([^>]*>\s*販売者ログイン\s*<\/button>)/i,
    '$1 data-demo-route="/pages/login.html"$2');
  html = html.replace(/(<button\b[^>]*type=["']button["'][^>]*)(?:\s+onclick=["'][^"']*["'])?([^>]*>\s*購入者ログイン\s*<\/button>)/i,
    '$1 data-demo-route="/pages/login.html"$2');
  return html;
}

const HOMEPAGE_NAVIGATION_FIX = `<script id="homepage-navigation-fix">
(() => {
  const go = path => window.location.assign(path);
  const textOf = el => (el?.textContent || '').replace(/\\s+/g, ' ').trim();

  document.addEventListener('click', event => {
    if (!event.target?.closest) return;
    const el = event.target.closest('a,button');
    if (!el) return;
    const text = textOf(el);
    if (text === '販売者デモ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      go('/pages/creator-studio.html');
      return;
    }
    if (text === '購入者デモ') {
      event.preventDefault();
      event.stopImmediatePropagation();
      go('/pages/video-list.html');
      return;
    }
    if (text === '販売者ログイン' || text === '購入者ログイン') {
      event.preventDefault();
      event.stopImmediatePropagation();
      go('/pages/login.html');
    }
  }, true);
})();
</script>`;

function injectHomepageNavigation(html) {
  if (html.includes('id="homepage-navigation-fix"')) return html;
  const marker = /<\/body>/i;
  if (marker.test(html)) return html.replace(marker, `${HOMEPAGE_NAVIGATION_FIX}</body>`);
  return `${html}${HOMEPAGE_NAVIGATION_FIX}`;
}

const server = createServer((req, res) => {
  const proxy = httpRequest({
    hostname: '127.0.0.1', port: upstreamPort, path: req.url,
    method: req.method, headers: req.headers
  }, upstream => {
    const chunks = [];
    upstream.on('data', chunk => chunks.push(chunk));
    upstream.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(upstream.headers['content-type'] || '');
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html') && (type.includes('text/html') || body.toString('utf8').includes('<html'))) {
        let html = reorderHomepage(body.toString('utf8'));
        html = repairHomepageNavigationMarkup(html);
        html = injectHomepageNavigation(html);
        body = Buffer.from(html, 'utf8');
      }
      const headers = { ...upstream.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
      delete headers['transfer-encoding'];
      res.writeHead(upstream.statusCode || 200, headers);
      res.end(body);
    });
  });
  proxy.on('error', err => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${err.message}`);
  });
  req.pipe(proxy);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE homepage order proxy listening on ${port}`));
