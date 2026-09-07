import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;
spawn(process.execPath, ['start.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const SYSTEM_BLOCK = `<section class="system-showcase-force" id="system-features-force"><div class="ssf-inner"><div class="ssf-kicker">COMPLETE VIDEO MARKETPLACE SYSTEM</div><h2>動画を販売するために必要な機能を、<br><em>すべてひとつに。</em></h2><p class="ssf-lead">購入者・販売者・運営者に必要な機能を、ひとつの動画販売システムに。完成された状態でそのまま運営でき、さらにロゴ・サイト名・カラー・画像・カテゴリー・メニュー・コンテンツ・デザインまで自由にカスタマイズできます。</p><div class="ssf-grid"><article><b>BUYER</b><strong>購入者機能</strong><span>会員登録・ログイン、検索、カテゴリー、商品詳細、カート、購入、決済、マイライブラリ、購入履歴、視聴・ダウンロード。</span></article><article><b>CREATOR</b><strong>販売者・クリエイター機能</strong><span>販売者登録、商品登録、動画アップロード、商品画像・説明、価格設定、公開管理、売上確認、売上管理、出金管理。</span></article><article><b>ADMIN</b><strong>運営・管理機能</strong><span>ユーザー、販売者、商品、動画、カテゴリー、注文、決済、売上、出金、メディア、サイト、セキュリティを一元管理。</span></article><article><b>CUSTOMIZE</b><strong>自由なカスタマイズ</strong><span>ロゴ、サイト名、カラー、画像、カテゴリー、商品情報、メニュー、トップページ、コンテンツ、世界観・デザインをブランドに合わせて変更。</span></article></div><div class="ssf-bottom"><strong>そのまま運営。カスタマイズも自由。</strong><span>教育・エンタメ・クリエイター・フィットネス・音楽・ビジネスなど、さまざまな動画販売サイトへ展開できます。</span></div></div></section>`;

const STYLE = `<style id="force-final-visual">.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{transform:scale(1.25)!important;transform-origin:top right!important}.system-showcase-force{display:block!important;position:relative!important;background:linear-gradient(180deg,#090a0d 0%,#111216 100%);border-top:1px solid rgba(183,155,91,.38);border-bottom:1px solid #29282a;padding:86px 6vw 92px;color:#f4f1eb}.ssf-inner{max-width:1280px;margin:0 auto}.ssf-kicker{font-size:10px;letter-spacing:.28em;color:#c6a864;font-weight:800}.system-showcase-force h2{font-size:clamp(38px,4.6vw,64px);line-height:1.1;letter-spacing:-.04em;margin:14px 0 20px}.system-showcase-force h2 em{font-style:normal;color:#d5ba79}.ssf-lead{max-width:920px;color:#aaa6a0;font-size:15px;line-height:1.95;margin:0}.ssf-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:42px}.ssf-grid article{min-height:210px;padding:28px;border:1px solid #343238;background:linear-gradient(145deg,#16171b,#0e0f12);display:flex;flex-direction:column}.ssf-grid b{font-size:10px;letter-spacing:.2em;color:#b79b5b}.ssf-grid strong{font-size:21px;margin:13px 0 12px}.ssf-grid span{color:#99958f;font-size:12px;line-height:1.9}.ssf-bottom{margin-top:28px;padding:27px 30px;border:1px solid rgba(183,155,91,.45);background:linear-gradient(120deg,#18150f,#101114);display:flex;justify-content:space-between;gap:30px;align-items:center}.ssf-bottom strong{font-size:22px}.ssf-bottom span{max-width:650px;color:#aaa6a0;font-size:12px;line-height:1.8}@media(max-width:900px){.hero{height:720px!important;min-height:720px!important}.ssf-grid{grid-template-columns:1fr 1fr}.ssf-bottom{display:block}.ssf-bottom span{display:block;margin-top:10px}}@media(max-width:600px){.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1)!important}.hero-mosaic{transform:scale(.9)!important}.system-showcase-force{padding:65px 20px}.ssf-grid{grid-template-columns:1fr}.system-showcase-force h2{font-size:36px}.ssf-bottom{padding:24px}}</style>`;

function finalize(html) {
  html = html.replaceAll('VIDORA', 'VIDEO MARKETPLACE');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-showcase\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  const hero = html.match(/<section\b[^>]*class=["'][^"']*\bhero\b[^"']*["'][^>]*>[\s\S]*?<\/section>/i);
  if (hero && hero.index != null) {
    const at = hero.index + hero[0].length;
    html = html.slice(0, at) + SYSTEM_BLOCK + html.slice(at);
  }
  return html.replace('</head>', STYLE + '</head>');
}

createServer((req, res) => {
  const proxyReq = httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers}, proxyRes => {
    const type = String(proxyRes.headers['content-type'] || '');
    if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/index.html')) && type.includes('text/html')) {
      const chunks=[];
      proxyRes.on('data', c => chunks.push(c));
      proxyRes.on('end', () => {
        const html = finalize(Buffer.concat(chunks).toString('utf8'));
        const headers={...proxyRes.headers,'content-length':Buffer.byteLength(html),'cache-control':'no-store'};
        delete headers['transfer-encoding'];
        res.writeHead(proxyRes.statusCode||200,headers);
        res.end(html);
      });
    } else {
      res.writeHead(proxyRes.statusCode||200,proxyRes.headers);
      proxyRes.pipe(res);
    }
  });
  proxyReq.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end('upstream error'); });
  req.pipe(proxyReq);
}).listen(port,'0.0.0.0');
