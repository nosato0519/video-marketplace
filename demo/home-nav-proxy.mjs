import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['safe-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

function patchHomepage(html) {
  return html
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>\s*販売者デモ<\/a>/, '<a class="system" href="/pages/creator-studio.html">販売者デモ</a>')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>\s*購入者デモ<\/a>/, '<a class="system" href="/pages/account.html">購入者デモ</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*販売者ログイン<\/button>/, '<button type="button" onclick="location.href=\'/pages/login.html?role=seller\'">販売者ログイン</button>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*購入者ログイン\s*<\/button>/, '<button type="button" onclick="location.href=\'/pages/login.html?role=buyer\'">購入者ログイン</button>');
}

const server = createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html') && type.includes('text/html')) {
        body = Buffer.from(patchHomepage(body.toString('utf8')), 'utf8');
      }
      const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate', pragma: 'no-cache', expires: '0' };
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

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE homepage navigation proxy listening on ${port}`));
const shutdown = () => process.exit(0);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
