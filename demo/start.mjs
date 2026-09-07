import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;
const root = fileURLToPath(new URL('.', import.meta.url));
const child = spawn(process.execPath, ['hero-proxy.mjs'], {
  cwd: root,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const guide = `<section class="system-guide-teaser" style="margin:48px auto 72px;max-width:1180px;padding:0 28px"><div style="border:1px solid rgba(183,155,91,.38);background:linear-gradient(120deg,#111114,#15130f);padding:42px 50px;display:flex;align-items:center;justify-content:space-between;gap:40px"><div><span style="font-size:10px;letter-spacing:.28em;color:#b79b5b">FOR PLATFORM OPERATORS</span><h2 style="font-size:32px;line-height:1.3;margin:10px 0">あなた自身の動画販売サイトを。</h2><p style="color:#aaa6a0;max-width:650px;margin:0;font-size:14px;line-height:1.9">動画を売る人と、買う人をつなぐ。販売者・購入者・運営者、それぞれが使える動画販売マーケットプレイスの仕組みを構築できます。</p></div><a href="/system-guide.html" style="flex:0 0 auto;border:1px solid #b79b5b;color:#d5ba79;padding:13px 22px;font-size:12px;letter-spacing:.08em">システムについて →</a></div></section>`;
const nav = `<a href="/system-guide.html" style="white-space:nowrap">システムについて</a>`;
const visualFix = `<style id="live-visual-fix">@media(min-width:761px){.hero{min-height:844px}.hero-copy{padding-top:132px;padding-left:6vw;max-width:790px}.hero-mosaic{right:7vw;top:78px;width:650px;height:506px}.mc1{width:362px;height:438px;left:0;top:38px}.mc2{width:300px;height:363px;right:0;top:0}.mc3{width:294px;height:325px;right:44px;bottom:-10px}.mosaic-tag{right:8px;bottom:2px}.hero-bg{filter:brightness(1.08) saturate(1.06)}}@media(min-width:1051px){.hero-mosaic{right:8.5vw}.hero-copy{padding-left:6.5vw}}</style>`;

function inject(html) {
  if (!html.includes('id="live-visual-fix"')) html = html.replace('</head>', `${visualFix}</head>`);
  html = html.replace('作品との新しい出会い', '作品との出会いを、もっと自由に。');
  if (!html.includes('href="/system-guide.html"')) {
    const navStart = html.indexOf('<nav');
    const navEnd = navStart >= 0 ? html.indexOf('</nav>', navStart) : -1;
    if (navStart >= 0 && navEnd >= 0) html = html.slice(0, navEnd) + nav + html.slice(navEnd);
  }
  if (!html.includes('class="system-guide-teaser"')) {
    const marker = '<section class="trustbar">';
    const markerPos = html.indexOf(marker);
    if (markerPos >= 0) html = html.slice(0, markerPos) + guide + html.slice(markerPos);
    else {
      const mainEnd = html.lastIndexOf('</main>');
      if (mainEnd >= 0) html = html.slice(0, mainEnd) + guide + html.slice(mainEnd);
    }
  }
  return html;
}

const server = createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/system-guide.html') {
    const html = await readFile(join(root, 'system-guide.html'), 'utf8');
    res.writeHead(200, {'content-type':'text/html; charset=utf-8','cache-control':'no-store'});
    res.end(html); return;
  }
  const proxyReq = httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers}, proxyRes => {
    const type = String(proxyRes.headers['content-type'] || '');
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html')) && type.includes('text/html')) {
      const chunks=[];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const html = inject(Buffer.concat(chunks).toString('utf8'));
        const headers={...proxyRes.headers,'content-length':Buffer.byteLength(html),'cache-control':'no-store'};
        delete headers['transfer-encoding'];
        res.writeHead(proxyRes.statusCode||200,headers); res.end(html);
      });
    } else { res.writeHead(proxyRes.statusCode||200,proxyRes.headers); proxyRes.pipe(res); }
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('upstream error'); });
  req.pipe(proxyReq);
});
server.listen(port,'0.0.0.0');
process.on('SIGTERM',()=>{child.kill('SIGTERM');server.close(()=>process.exit(0));});
process.on('SIGINT',()=>{child.kill('SIGINT');server.close(()=>process.exit(0));});
