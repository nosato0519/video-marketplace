import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const NAV_SCRIPT = `<script id="safe-video-navigation">
(() => {
  const ids = {
    'Creator Masterclass': 1,
    'Cinematic Travel Pack': 2,
    'Build Your Digital Product': 3,
    'Motion Design Toolkit': 4,
    'Designing Ideas': 5,
    'Mountain Silence': 6,
    'THE LAST SIGNAL': 7,
    'Tokyo After Hours': 8,
    'Build Your Brand': 9,
    'BLUE HORIZON': 10,
    'Mastering Motion': 11,
    'KYOTO IN MOTION': 12,
    'NIGHT SESSION': 13,
    'THE CRAFTSMEN': 14
  };
  const go = id => { window.location.assign('/pages/product-detail.html?product=' + encodeURIComponent(id)); };
  const findId = el => {
    if (!el) return null;
    const direct = el.closest('[data-video-id]');
    if (direct && direct.dataset.videoId) return Number(direct.dataset.videoId);
    const text = (el.closest('.video-card, .card, .showcase-card, .recommendation-card, .mosaic-card')?.textContent || el.textContent || '').replace(/\\s+/g, ' ').trim();
    for (const [title, id] of Object.entries(ids)) if (text.includes(title)) return id;
    return null;
  };
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const card = target.closest('.video-card, .card, .showcase-card, .recommendation-card, .mosaic-card');
    if (!card) return;
    const id = findId(card);
    if (!id) return;
    event.preventDefault();
    event.stopPropagation();
    go(id);
  }, true);
  document.querySelectorAll('.video-card, .card, .showcase-card, .recommendation-card, .mosaic-card').forEach(card => {
    if (findId(card)) card.style.cursor = 'pointer';
  });
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
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && type.includes('text/html') && !req.url.startsWith('/api/')) {
        const html = body.toString('utf8');
        body = Buffer.from(html.includes('</body>') ? html.replace('</body>', `${NAV_SCRIPT}</body>`) : html, 'utf8');
      }
      const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
      delete headers['transfer-encoding'];
      res.writeHead(response.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', error => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${error.message}`);
  });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE safe proxy listening on ${port}`));
const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
