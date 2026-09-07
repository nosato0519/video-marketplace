import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;
spawn(process.execPath, ['launcher.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const SYSTEM_BLOCK = `<section class="system-showcase-force" id="system-features-force"><div class="ssf-inner"><div class="ssf-kicker">COMPLETE VIDEO MARKETPLACE SYSTEM</div><h2>このまま運営できる。<br><em>カスタマイズも、自由。</em></h2><p class="ssf-lead">動画販売サイトを運営するために必要な機能を、購入者・販売者・運営者のすべてに対応した一つの完成システムに。デモの構成をそのままベースに運営でき、ロゴ・サイト名・カラー・画像・カテゴリー・メニュー・文章・トップページ・デザインまで、ブランドやサービスに合わせて自由に変更できます。</p><div class="ssf-grid"><article><b>BUYER</b><strong>購入者機能</strong><span>会員登録・ログイン、プロフィール、動画検索、キーワード検索、カテゴリー閲覧、商品一覧、商品詳細、作品プレビュー、カート、購入、決済、購入確認、マイライブラリ、購入履歴、購入済み作品の視聴、ダウンロード、視聴ページ、保護された動画配信。</span></article><article><b>CREATOR</b><strong>販売者・クリエイター機能</strong><span>販売者登録、販売者プロフィール、商品登録、動画登録・アップロード、サムネイル・商品画像、タイトル・説明、カテゴリー設定、価格設定、公開・非公開管理、商品管理、販売状況確認、売上確認、売上管理、出金申請、販売者向け導線。</span></article><article><b>ADMIN</b><strong>運営・管理機能</strong><span>管理画面、ユーザー管理、販売者管理、販売者承認、商品管理、商品審査・公開管理、動画管理、カテゴリー管理、注文管理、決済管理、売上管理、出金管理、メディア管理、サイト管理、セキュリティ管理、運営全体の一元管理。</span></article><article><b>SEARCH &amp; DISCOVERY</b><strong>探す・見つける機能</strong><span>キーワード検索、カテゴリー、人気作品、注目作品、作品一覧、作品詳細、クリエイター紹介、クリエイター一覧、特集・スポットライト、関連コンテンツ、目的の動画へスムーズにたどり着ける導線。</span></article><article><b>ORDER &amp; PAYMENT</b><strong>購入・決済機能</strong><span>カート、注文作成、購入フロー、決済処理、注文完了、購入履歴、購入権限の付与、購入後のライブラリ反映、購入済みコンテンツへのアクセス管理。</span></article><article><b>MEDIA DELIVERY</b><strong>視聴・配信機能</strong><span>購入済み動画の視聴、保護されたメディアアクセス、ダウンロード対応、未購入コンテンツへのアクセス制御、マイライブラリからの視聴導線、購入権限に応じたコンテンツ提供。</span></article><article><b>RESPONSIVE &amp; UX</b><strong>使いやすいサイト設計</strong><span>PC・タブレット・スマートフォンに対応したレスポンシブUI、検索・カテゴリー・購入・視聴までの導線、購入者・販売者・運営者それぞれに分かりやすい画面構成。</span></article><article><b>CUSTOMIZE</b><strong>自由なカスタマイズ</strong><span>ロゴ、サイト名、カラー、フォント、画像、動画、カテゴリー、商品情報、メニュー、トップページ、文章、ボタン、コンテンツ、セクション構成、ブランドの世界観、全体デザインまで自由に変更できます。</span></article></div><div class="ssf-bottom"><div><strong>完成した土台を、そのまま自分のサービスへ。</strong><span>教育・オンライン講座・エンタメ・クリエイター作品・フィットネス・音楽・映像作品・ビジネス・企業研修など、さまざまなジャンルの動画販売サイトに展開できます。</span></div><div class="ssf-badge"><b>READY TO OPERATE</b><small>そのまま運営 ＋ 自由にカスタム</small></div></div></div></section>`;

const STYLE = `<style id="force-final-visual">.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{transform:scale(1.25)!important;transform-origin:top right!important}.system-showcase-force{display:block!important;position:relative!important;background:linear-gradient(180deg,#090a0d 0%,#111216 100%);border-top:1px solid rgba(183,155,91,.38);border-bottom:1px solid #29282a;padding:86px 6vw 92px;color:#f4f1eb}.ssf-inner{max-width:1280px;margin:0 auto}.ssf-kicker{font-size:10px;letter-spacing:.28em;color:#c6a864;font-weight:800}.system-showcase-force h2{font-size:clamp(38px,4.6vw,64px);line-height:1.1;letter-spacing:-.04em;margin:14px 0 20px}.system-showcase-force h2 em{font-style:normal;color:#d5ba79}.ssf-lead{max-width:980px;color:#aaa6a0;font-size:15px;line-height:1.95;margin:0}.ssf-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:42px}.ssf-grid article{min-height:225px;padding:28px;border:1px solid #343238;background:linear-gradient(145deg,#16171b,#0e0f12);display:flex;flex-direction:column;transition:transform .2s ease,border-color .2s ease}.ssf-grid article:hover{transform:translateY(-3px);border-color:rgba(183,155,91,.7)}.ssf-grid b{font-size:10px;letter-spacing:.2em;color:#b79b5b}.ssf-grid strong{font-size:20px;margin:13px 0 12px}.ssf-grid span{color:#99958f;font-size:12px;line-height:1.9}.ssf-bottom{margin-top:28px;padding:27px 30px;border:1px solid rgba(183,155,91,.45);background:linear-gradient(120deg,#18150f,#101114);display:flex;justify-content:space-between;gap:30px;align-items:center}.ssf-bottom>div:first-child{flex:1}.ssf-bottom strong{display:block;font-size:22px}.ssf-bottom span{display:block;max-width:760px;color:#aaa6a0;font-size:12px;line-height:1.8;margin-top:8px}.ssf-badge{min-width:245px;text-align:center;padding:16px 18px;border:1px solid rgba(198,168,100,.5);background:#0d0e11}.ssf-badge b{display:block;font-size:10px;letter-spacing:.18em;color:#c6a864}.ssf-badge small{display:block;margin-top:7px;color:#ddd7cc;font-size:11px}.trustbar{margin-bottom:0}.system-showcase-force + .platform{margin-top:0}.system-showcase-force + .video-showcase{margin-top:0}@media(max-width:1100px){.ssf-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.hero{height:720px!important;min-height:720px!important}.ssf-bottom{display:block}.ssf-badge{margin-top:20px;max-width:320px}.ssf-bottom span{max-width:none}}@media(max-width:600px){.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1)!important}.hero-mosaic{transform:scale(.9)!important}.system-showcase-force{padding:65px 20px}.ssf-grid{grid-template-columns:1fr}.system-showcase-force h2{font-size:36px}.ssf-bottom{padding:24px}.ssf-badge{min-width:0;width:100%}}</style>`;

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function takeSection(html, selector) {
  let start = html.indexOf(selector);
  if (start < 0) {
    const classMatch = selector.match(/class=["']([^"']+)["']/i);
    const idMatch = selector.match(/id=["']([^"']+)["']/i);
    const token = classMatch?.[1] || idMatch?.[1];
    if (!token) return { html, section: '' };
    const attr = classMatch ? `class=["'][^"']*\\b${escapeRegExp(token)}\\b[^"']*["']` : `id=["']${escapeRegExp(token)}["']`;
    const openRe = new RegExp(`<section\\b[^>]*${attr}[^>]*>`, 'i');
    const match = openRe.exec(html);
    start = match ? match.index : -1;
  }
  if (start < 0) return { html, section: '' };
  const sectionStart = html.lastIndexOf('<section', start);
  const end = html.indexOf('</section>', start);
  if (sectionStart < 0 || end < 0) return { html, section: '' };
  const section = html.slice(sectionStart, end + '</section>'.length);
  return { html: html.slice(0, sectionStart) + html.slice(end + '</section>'.length), section };
}

function finalize(html) {
  html = html.replaceAll('VIDORA', 'VIDEO MARKETPLACE');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-showcase\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<section\b[^>]*class=["'][^"']*\bsystem-guide-teaser\b[^"']*["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/<section\b[^>]*id=["']guide["'][^>]*>[\s\S]*?<\/section>/gi, '');
  html = html.replace(/href=["']#guide["']/gi, 'href="#system-features-force"');

  const hero = takeSection(html, '<section class="hero"');
  html = hero.html;
  const system = SYSTEM_BLOCK;
  const platformTake = takeSection(html, '<section class="platform"');
  html = platformTake.html;
  const showcaseTake = takeSection(html, '<section class="video-showcase"');
  html = showcaseTake.html;
  const trustTake = takeSection(html, '<section class="trustbar"');
  html = trustTake.html;
  const popularTake = takeSection(html, '<section class="section" id="videos"');
  html = popularTake.html;
  const spotlightTake = takeSection(html, '<section class="spotlight"');
  html = spotlightTake.html;
  const collectionsTake = takeSection(html, '<section class="video-collections"');
  html = collectionsTake.html;
  const genreRailTake = takeSection(html, '<section class="genre-rail"');
  html = genreRailTake.html;
  const recommendationsTake = takeSection(html, '<section class="genre-recommendations"');
  html = recommendationsTake.html;

  const orderedTop = [
    hero.section,
    system,
    platformTake.section,
    showcaseTake.section,
    trustTake.section,
    popularTake.section,
    spotlightTake.section,
    collectionsTake.section,
    genreRailTake.section,
    recommendationsTake.section
  ].filter(Boolean).join('');

  html = orderedTop + html;
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
        const headers={...proxyRes.headers,'content-length':Buffer.byteLength(html),'cache-control':'no-store','x-demo-version':'20260907-v25'};
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