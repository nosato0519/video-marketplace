import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const backend = 'http://127.0.0.1:3000';
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8' };

function proxyApi(req, res) {
  const upstream = http.request(new URL(req.url, backend), {
    method: req.method,
    headers: { ...req.headers, host: '127.0.0.1:3000' },
  }, (response) => {
    res.writeHead(response.statusCode || 502, response.headers);
    response.pipe(res);
  });
  upstream.on('error', (error) => { res.writeHead(502, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: error.message })); });
  req.pipe(upstream);
}

http.createServer((req, res) => {
  if (req.url?.startsWith('/api/')) return proxyApi(req, res);
  const requestPath = decodeURIComponent((req.url || '/').split('?')[0]);
  const relative = requestPath === '/' ? '/app/index.html' : requestPath;
  const file = path.resolve(root, `.${relative}`);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  const ext = path.extname(file);
  res.writeHead(200, { 'content-type': mime[ext] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`CI frontend proxy listening on ${port}`));
