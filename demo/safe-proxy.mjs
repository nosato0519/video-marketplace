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
  const go = id => { location.href = `/pages/product-detail.html?product=${encodeURIComponent(id)}`; };
  const titleId = el => {
    const text = (el.textContent || '').replace(/\\s+/g, ' ').trim();
    for (const [title, id] of Object.entries(ids)) if (text.includes(title)) return id;
    return null;
  };
  document.querySelectorAll('.video-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => {
      const id = Number(card.dataset.videoId || titleId(card) || 1);
      go(id);
    });
  });
  document.querySelectorAll('.card').forEach(card => {
    if (card.closest('.video-card')) return;
    const id = titleId(card);
    if (!id) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', () => go(id));
  });
  document.querySelectorAll('.showcase-card, .recommendation-card, .mosaic-card').forEach(card => {
    const id = titleId(card);
    if (!id) return;
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => { e.preventDefault(); go(id); });
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
