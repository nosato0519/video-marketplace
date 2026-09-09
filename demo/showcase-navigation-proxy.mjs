import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFile, writeFile, unlink } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';

const ROOT = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4176);
const upstreamPort = Number(process.env.UPSTREAM_PORT || 4177);
const launcherPort = Number(process.env.LAUNCHER_PORT || 4178);

const forcePageSource = await readFile(join(ROOT, 'force-page.mjs'), 'utf8');
const patchedForcePage = forcePageSource
  .replace(/const port = Number\(process\.env\.PORT \|\| 4173\);/, `const port = Number(process.env.PORT || ${upstreamPort});`)
  .replace(/const upstreamPort = port === 4173 \? 4174 : 4173;/, `const upstreamPort = ${launcherPort};`);
const forcePageTemp = join(ROOT, `.showcase-force-page-${randomUUID()}.mjs`);
await writeFile(forcePageTemp, patchedForcePage, 'utf8');

const child = spawn(process.execPath, [forcePageTemp], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

child.on('exit', async code => {
  try { await unlink(forcePageTemp); } catch {}
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
    if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(String(err));
  });
  req.pipe(proxyReq);
});

const shutdown = async () => {
  server.close();
  if (!child.killed) child.kill('SIGTERM');
  try { await unlink(forcePageTemp); } catch {}
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

server.listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE showcase proxy listening on ${port} -> force-page ${upstreamPort} -> launcher ${launcherPort}`);
});
