import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

spawn(process.execPath, ['link-fix-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

function reorderHomepage(html) {
  const start = html.search(/<section\b[^>]*class=["'][^"']*\bnew-releases-section\b[^"']*["'][^>]*>/i);
  if (start < 0) return html;
  const end = html.indexOf('</section>', start);
  if (end < 0) return html;
  const newReleases = html.slice(start, end + '</section>'.length);
  const withoutNew = html.slice(0, start) + html.slice(end + '</section>'.length);
  const popular = withoutNew.search(/<section\b[^>]*id=["']popular["'][^>]*>/i);
  if (popular < 0) return html;
  const popularEnd = withoutNew.indexOf('</section>', popular);
  if (popularEnd < 0) return html;
  return withoutNew.slice(0, popularEnd + '</section>'.length) + newReleases + withoutNew.slice(popularEnd + '</section>'.length);
}

const server = createServer((req, res) => {
  const proxy = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, upstream => {
    const chunks = [];
    upstream.on('data', chunk => chunks.push(chunk));
    upstream.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(upstream.headers['content-type'] || '');
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html') && type.includes('text/html')) {
        body = Buffer.from(reorderHomepage(body.toString('utf8')), 'utf8');
      }
      const headers = { ...upstream.headers };
      headers['content-length'] = String(body.length);
      delete headers['transfer-encoding'];
      res.writeHead(upstream.statusCode || 200, headers);
      res.end(body);
    });
  });
  proxy.on('error', err => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${err.message}`);
  });
  req.pipe(proxy);
});

server.listen(port, '0.0.0.0');
