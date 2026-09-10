import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

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
      const body = Buffer.concat(chunks);
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
