import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const publicPort = Number(process.env.PORT || 4173);
const upstreamPort = publicPort === 4173 ? 4174 : 4173;
const child = spawn(process.execPath, ['launcher.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const HERO_STYLE = `<style id="hero-size-final">
.hero{min-height:844px!important;height:844px!important}
.hero-copy{padding-top:132px!important;padding-left:8.75vw!important;max-width:900px!important;transform:scale(1.25)!important;transform-origin:left top!important}
.hero-mosaic{top:131px!important;right:3.5vw!important;width:650px!important;height:506px!important;transform:scale(1.25)!important;transform-origin:top right!important}
@media(max-width:900px){.hero{min-height:760px!important;height:760px!important}.hero-copy{padding-top:110px!important;padding-left:7vw!important;max-width:82vw!important;transform:scale(1.15)!important}.hero-mosaic{top:330px!important;right:-20px!important;width:430px!important;height:335px!important;transform:scale(1.05)!important}}
@media(max-width:650px){.hero{min-height:700px!important;height:700px!important}.hero-copy{padding-top:82px!important;padding-left:6vw!important;max-width:88vw!important;transform:scale(1)!important}.hero-mosaic{top:370px!important;right:-65px!important;width:390px!important;height:304px!important;transform:scale(.9)!important;opacity:.9}}
</style>`;

const server = createServer((req, res) => {
  const proxyReq = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, proxyRes => {
    const type = String(proxyRes.headers['content-type'] || '');
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html')) && type.includes('text/html')) {
      const chunks = [];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        let html = Buffer.concat(chunks).toString('utf8');
        html = html.replace('</head>', `${HERO_STYLE}</head>`);
        const headers = { ...proxyRes.headers, 'content-length': Buffer.byteLength(html), 'cache-control': 'no-store' };
        delete headers['transfer-encoding'];
        res.writeHead(proxyRes.statusCode || 200, headers);
        res.end(html);
      });
    } else {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
      proxyRes.pipe(res);
    }
  });
  proxyReq.on('error', err => { if (!res.headersSent) res.writeHead(502); res.end('upstream error'); });
  req.pipe(proxyReq);
});

server.listen(publicPort, '0.0.0.0');
process.on('SIGTERM', () => { child.kill('SIGTERM'); server.close(() => process.exit(0)); });
process.on('SIGINT', () => { child.kill('SIGINT'); server.close(() => process.exit(0)); });
