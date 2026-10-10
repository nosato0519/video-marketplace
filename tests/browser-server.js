import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.BROWSER_SERVER_PORT || 4173);
const backendUrl = new URL(process.env.BROWSER_BACKEND_URL || 'http://127.0.0.1:3000');

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function resolveStaticPath(requestPath) {
  if (requestPath === '/') return path.join(root, 'app', 'index.html');

  // The application is deployed with app/ as its static root. Resolve
  // root-relative frontend assets there first so repository-level files such
  // as /styles.css cannot shadow the application's own stylesheet or modules.
  const appPath = path.resolve(root, 'app', `.${requestPath}`);
  if (appPath.startsWith(path.join(root, 'app') + path.sep) && fs.existsSync(appPath) && fs.statSync(appPath).isFile()) {
    return appPath;
  }

  const repositoryPath = path.resolve(root, `.${requestPath}`);
  if (repositoryPath.startsWith(root + path.sep) && fs.existsSync(repositoryPath) && fs.statSync(repositoryPath).isFile()) {
    return repositoryPath;
  }

  return null;
}

function sendStatic(req, res) {
  const requestPath = decodeURIComponent(new URL(req.url, `http://${req.headers.host}`).pathname);
  const filePath = resolveStaticPath(requestPath);

  if (!filePath) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  const contentType = mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  res.writeHead(200, { 'content-type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

function proxyApi(req, res) {
  const target = new URL(req.url, backendUrl);
  const headers = { ...req.headers, host: target.host };
  const proxyReq = http.request(
    {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port,
      method: req.method,
      path: `${target.pathname}${target.search}`,
      headers,
    },
    (proxyRes) => {
      const responseHeaders = { ...proxyRes.headers };
      delete responseHeaders['content-security-policy'];
      res.writeHead(proxyRes.statusCode || 502, responseHeaders);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (error) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: { code: 'BACKEND_UNAVAILABLE', message: error.message } }));
  });

  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  if (req.url?.startsWith('/api/')) {
    proxyApi(req, res);
    return;
  }
  sendStatic(req, res);
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Browser test server listening on http://127.0.0.1:${port}`);
});
