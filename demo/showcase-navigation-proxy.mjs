import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const ROOT = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4176);
const upstreamPort = Number(process.env.UPSTREAM_PORT || 4177);

const child = spawn(process.execPath, ['launcher.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

child.on('exit', code => {
  if (code !== 0) process.exitCode = code ?? 1;
});

const server = createServer((req, res) => {
  const target = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const proxyReq = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: target.pathname + target.search,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${upstreamPort}` },
  }, proxyRes => {
    res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', err => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  });
  req.pipe(proxyReq);
});

const shutdown = () => {
  server.close();
  if (!child.killed) child.kill('SIGTERM');
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE showcase proxy listening on ${port} -> launcher ${upstreamPort}`);
});
