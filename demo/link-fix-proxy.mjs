import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = 4174;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

function patchHomepage(html) {
  const patchAnchor = (source, label, target) => source.replace(
    new RegExp(`<a\\b([^>]*)>([\\s\\S]*?${label}[\\s\\S]*?)<\\/a>`, 'gi'),
    (_m, attrs, body) => {
      const cleanAttrs = attrs
        .replace(/\\s+onclick\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '')
        .replace(/\\s+href\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '');
      return `<a${cleanAttrs} href="${target}">${body}</a>`;
    }
  );

  const patchButton = (source, label, target) => source.replace(
    new RegExp(`<button\\b([^>]*)>([\\s\\S]*?${label}[\\s\\S]*?)<\\/button>`, 'gi'),
    (_m, attrs, body) => {
      const cleanAttrs = attrs.replace(/\\s+onclick\\s*=\\s*(?:"[^"]*"|'[^']*')/gi, '');
      return `<button${cleanAttrs} onclick="window.location.href='${target}'">${body}</button>`;
    }
  );

  html = patchAnchor(html, '販売者デモ', '/pages/creator-studio.html');
  html = patchAnchor(html, '購入者デモ', '/pages/library.html');
  html = patchButton(html, '販売者デモ', '/pages/creator-studio.html');
  html = patchButton(html, '購入者デモ', '/pages/library.html');
  return html;
}

function proxy(req, res) {
  const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, upstream => {
    const chunks = [];
    upstream.on('data', chunk => chunks.push(chunk));
    upstream.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(upstream.headers['content-type'] || '');
      if ((req.url === '/' || req.url === '/index.html') && type.includes('text/html')) {
        body = Buffer.from(patchHomepage(body.toString('utf8')), 'utf8');
      }
      const headers = { ...upstream.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
      delete headers['transfer-encoding'];
      res.writeHead(upstream.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', err => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${err.message}`);
  });
  req.pipe(upstream);
}

createServer(proxy).listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE link-fix proxy listening on http://0.0.0.0:${port}`);
});

const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
