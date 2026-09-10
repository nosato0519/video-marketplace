import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const IDS = {
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

const DETAIL_DATA = {
  7: { image: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=88' },
  8: { image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=88' },
  9: { image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=88' },
  10: { image: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=88' },
  11: { image: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=88' },
  12: { image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=1200&q=88' },
  13: { image: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=88' },
  14: { image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=88' }
};

const NAV_SCRIPT = `<script id="safe-video-navigation">
(() => {
  const ids = ${JSON.stringify(IDS)};
  const go = id => window.location.assign('/pages/product-detail.html?product=' + encodeURIComponent(id));
  const findId = card => {
    if (!card) return null;
    const direct = card.closest('[data-video-id]');
    if (direct?.dataset.videoId) return Number(direct.dataset.videoId);
    const title = (card.querySelector('h3,h2,[data-video-title],.showcase-label,.title')?.textContent || '').replace(/\\s+/g, ' ').trim();
    return ids[title] || null;
  };
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest('.video-card, .card, .showcase-card, .recommendation-card, .mosaic-card');
    if (!card) return;
    const id = findId(card);
    if (!id) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    go(id);
  }, true);
  document.querySelectorAll('.video-card, .card, .showcase-card, .recommendation-card, .mosaic-card').forEach(card => {
    if (findId(card)) card.style.cursor = 'pointer';
  });
})();
</script>`;

const DETAIL_SCRIPT = `<script id="safe-detail-data">
(() => {
  const data = ${JSON.stringify(DETAIL_DATA)};
  const id = Number(new URLSearchParams(location.search).get('product') || 1);
  const item = data[id];
  if (!item) return;
  const visual = document.querySelector('.visual');
  if (visual) {
    visual.style.backgroundImage = "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('" + item.image + "')";
    visual.style.backgroundPosition = 'center';
    visual.style.backgroundSize = 'cover';
  }
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
        let html = body.toString('utf8');
        if (req.url.split('?')[0] === '/pages/product-detail.html') {
          html = html.includes('</body>') ? html.replace('</body>', `${DETAIL_SCRIPT}</body>`) : html;
        }
        html = html.includes('</body>') ? html.replace('</body>', `${NAV_SCRIPT}</body>`) : html;
        body = Buffer.from(html, 'utf8');
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
