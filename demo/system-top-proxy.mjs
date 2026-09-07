import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;

spawn(process.execPath, ['force-page.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

function extractSection(html, id) {
  const marker = id ? `id="${id}"` : null;
  const markerIndex = marker ? html.indexOf(marker) : -1;
  const open = html.indexOf('<section', markerIndex >= 0 ? markerIndex : 0);
  if (open < 0) return null;
  const token = /<section\b[^>]*>|<\/section>/gi;
  token.lastIndex = open;
  let depth = 0, match;
  while ((match = token.exec(html))) {
    if (match[0][1] === '/') depth--;
    else depth++;
    if (depth === 0) return { start: open, end: token.lastIndex, html: html.slice(open, token.lastIndex) };
  }
  return null;
}

function moveSystemTop(html) {
  const system = extractSection(html, 'system-features-force');
  const heroMatch = html.match(/<section\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>/i);
  if (!system || !heroMatch) return html;
  const heroStart = heroMatch.index;
  const token = /<section\b[^>]*>|<\/section>/gi;
  token.lastIndex = heroStart;
  let depth = 0, heroEnd = -1, match;
  while ((match = token.exec(html))) {
    if (match[0][1] === '/') depth--;
    else depth++;
    if (depth === 0) { heroEnd = token.lastIndex; break; }
  }
  if (heroEnd < 0 || system.start === heroEnd) return html;
  const without = html.slice(0, system.start) + html.slice(system.end);
  const adjustedHeroEnd = heroEnd - (system.start < heroEnd ? system.html.length : 0);
  return without.slice(0, adjustedHeroEnd) + system.html + without.slice(adjustedHeroEnd);
}

createServer((req, res) => {
  const proxyReq = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, proxyRes => {
    const type = String(proxyRes.headers['content-type'] || '');
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html')) && type.includes('text/html')) {
      const chunks = [];
      proxyRes.on('data', chunk => chunks.push(chunk));
      proxyRes.on('end', () => {
        const html = moveSystemTop(Buffer.concat(chunks).toString('utf8'));
        const headers = { ...proxyRes.headers, 'content-length': Buffer.byteLength(html), 'cache-control': 'no-store', 'x-demo-version': '20260907-system-top-v1' };
        delete headers['transfer-encoding'];
        res.writeHead(proxyRes.statusCode || 200, headers);
        res.end(html);
      });
    } else {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('upstream error'); });
  req.pipe(proxyReq);
}).listen(port, '0.0.0.0');
