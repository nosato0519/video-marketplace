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
const featureShowcase = `<section class="system-showcase" id="system-features"><style>.system-showcase{padding:88px 6vw;border-top:1px solid #29282a;border-bottom:1px solid #29282a;background:linear-gradient(180deg,#0b0c10,#101114)}.system-showcase .ss-inner{max-width:1280px;margin:auto}.system-showcase .ss-kicker{font-size:10px;letter-spacing:.28em;color:#c6a864;font-weight:800}.system-showcase h2{font-size:clamp(34px,4.2vw,58px);line-height:1.12;letter-spacing:-.035em;margin:14px 0}.system-showcase .ss-lead{max-width:850px;color:#aaa6a0;font-size:15px;line-height:1.9}.ss-promise{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin:34px 0 54px}.ss-promise article,.ss-feature,.ss-genre{border:1px solid #302e2d;background:linear-gradient(145deg,#141519,#0d0e11);padding:25px}.ss-promise b{display:block;font-size:20px;margin-bottom:8px}.ss-promise span,.ss-feature p,.ss-genre span{color:#99958f;font-size:12px;line-height:1.8}.ss-title{font-size:28px;margin:0 0 22px}.ss-role{margin-top:46px}.ss-role-head{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:18px}.ss-role-head small{color:#b79b5b;letter-spacing:.16em}.ss-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.ss-feature b{display:block;font-size:15px;margin-bottom:7px}.ss-genre-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}.ss-genre strong{display:block;font-size:13px;margin-bottom:3px}.ss-flow{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:#302e2d;margin-top:22px}.ss-step{background:#111216;padding:22px;min-height:135px}.ss-step em{font-style:normal;color:#b79b5b;font-size:10px;letter-spacing:.15em}.ss-step b{display:block;font-size:16px;margin:10px 0 5px}.ss-step span{color:#99958f;font-size:11px}.ss-custom{margin-top:48px;padding:30px;border:1px solid rgba(183,155,91,.35);background:linear-gradient(120deg,#15130f,#101114)}.ss-custom strong{font-size:21px}.ss-custom p{color:#aaa6a0;font-size:12px;margin:8px 0 0}@media(max-width:900px){.ss-promise,.ss-grid,.ss-genre-grid,.ss-flow{grid-template-columns:1fr 1fr}.ss-role-head{display:block}}@media(max-width:600px){.system-showcase{padding:65px 20px}.ss-promise,.ss-grid,.ss-genre-grid,.ss-flow{grid-template-columns:1fr}}</style><div class="ss-inner"><span class="ss-kicker">COMPLETE VIDEO MARKETPLACE SYSTEM</span><h2>動画を販売するために必要な機能を、<br><em>すべてひとつに。</em></h2><p class="ss-lead">購入者・販売者・運営者。それぞれに必要な機能をひとつの動画販売システムにまとめ、さらにロゴ・デザイン・カテゴリー・コンテンツまで自由にカスタマイズ。教育、エンタメ、クリエイター、フィットネス、音楽、ビジネスなど、どんな種類の動画販売サイトにも展開できます。</p><div class="ss-promise"><article><b>そのまま運営</b><span>動画の販売・購入・決済・視聴・管理まで、サイト運営に必要な流れをひとつに。</span></article><article><b>自由にカスタマイズ</b><span>ロゴ、サイト名、カラー、画像、カテゴリー、商品、メニュー、トップページをブランドに合わせて変更。</span></article><article><b>ジャンルを限定しない</b><span>販売する動画のジャンルに合わせてサイトの見せ方やカテゴリーを組み替えられます。</span></article></div><div class="ss-role"><div class="ss-role-head"><div><small>01 / BUYER</small><h3 class="ss-title">購入者の機能</h3></div></div><div class="ss-grid"><div class="ss-feature"><b>会員登録・ログイン</b><p>アカウントを作成して購入情報を管理。</p></div><div class="ss-feature"><b>動画検索・カテゴリー</b><p>キーワードやカテゴリーから作品を検索。</p></div><div class="ss-feature"><b>商品詳細・サンプル</b><p>作品情報、価格、販売者情報を確認。</p></div><div class="ss-feature"><b>カート・購入</b><p>作品をカートに入れて購入フローへ。</p></div><div class="ss-feature"><b>決済</b><p>実運営では利用する決済サービスと連携可能な構成。</p></div><div class="ss-feature"><b>マイライブラリ</b><p>購入済み作品をまとめて管理。</p></div><div class="ss-feature"><b>購入履歴</b><p>過去の注文・購入作品を確認。</p></div><div class="ss-feature"><b>保護されたコンテンツアクセス</b><p>購入権限を前提に視聴・配信する設計。</p></div></div></div><div class="ss-role"><div class="ss-role-head"><div><small>02 / SELLER / CREATOR</small><h3 class="ss-title">販売者・クリエイターの機能</h3></div></div><div class="ss-grid"><div class="ss-feature"><b>販売者アカウント</b><p>販売者として作品を管理。</p></div><div class="ss-feature"><b>商品登録・編集</b><p>タイトル、説明、価格、カテゴリー等を設定。</p></div><div class="ss-feature"><b>動画アップロード</b><p>販売動画を商品と紐付けて登録。</p></div><div class="ss-feature"><b>販売状態管理</b><p>公開・非公開・審査などを管理。</p></div><div class="ss-feature"><b>売上確認</b><p>販売数や売上を確認。</p></div><div class="ss-feature"><b>出金管理</b><p>売上から出金フローへつなげる管理領域。</p></div></div></div><div class="ss-role"><div class="ss-role-head"><div><small>03 / ADMIN</small><h3 class="ss-title">運営者・管理者の機能</h3></div></div><div class="ss-grid"><div class="ss-feature"><b>ユーザー管理</b><p>購入者・販売者のアカウントや権限を管理。</p></div><div class="ss-feature"><b>販売者管理</b><p>販売者の登録状況や作品を管理。</p></div><div class="ss-feature"><b>商品・動画管理</b><p>作品の公開・非公開などを管理。</p></div><div class="ss-feature"><b>注文・購入管理</b><p>注文や購入情報を確認。</p></div><div class="ss-feature"><b>決済管理</b><p>決済サービスに合わせて運営側を管理。</p></div><div class="ss-feature"><b>売上・出金管理</b><p>サイト全体の売上や出金を管理。</p></div><div class="ss-feature"><b>メディア管理</b><p>動画・サムネイル等のメディアを整理。</p></div><div class="ss-feature"><b>セキュリティ</b><p>認証・権限・購入者アクセスを考慮。</p></div></div></div><div class="ss-role"><div class="ss-role-head"><div><small>04 / CUSTOMIZE</small><h3 class="ss-title">カスタマイズできるもの</h3></div></div><div class="ss-grid"><div class="ss-feature"><b>ロゴ</b><p>オリジナルロゴへ変更。</p></div><div class="ss-feature"><b>サイト名</b><p>ブランド名・サービス名へ変更。</p></div><div class="ss-feature"><b>カラー</b><p>ブランドカラーに合わせて変更。</p></div><div class="ss-feature"><b>画像</b><p>メイン画像・商品画像を変更。</p></div><div class="ss-feature"><b>カテゴリー</b><p>販売ジャンルに合わせて変更。</p></div><div class="ss-feature"><b>商品情報</b><p>商品名・説明・価格等を変更。</p></div><div class="ss-feature"><b>メニュー</b><p>必要な導線に合わせて変更。</p></div><div class="ss-feature"><b>トップページ</b><p>サイトの世界観に合わせて構成。</p></div></div></div><div class="ss-role"><div class="ss-role-head"><div><small>05 / USE CASES</small><h3 class="ss-title">どんな動画販売サイトにも</h3></div></div><div class="ss-genre-grid"><div class="ss-genre"><strong>EDUCATION</strong><span>教育・学習</span></div><div class="ss-genre"><strong>ENTERTAINMENT</strong><span>エンタメ</span></div><div class="ss-genre"><strong>CREATOR</strong><span>クリエイター作品</span></div><div class="ss-genre"><strong>FITNESS</strong><span>フィットネス</span></div><div class="ss-genre"><strong>MUSIC</strong><span>音楽・ライブ</span></div><div class="ss-genre"><strong>BUSINESS</strong><span>ビジネス</span></div><div class="ss-genre"><strong>TRAVEL</strong><span>旅行・文化</span></div><div class="ss-genre"><strong>COOKING</strong><span>料理・レシピ</span></div><div class="ss-genre"><strong>ART / DESIGN</strong><span>アート・デザイン</span></div><div class="ss-genre"><strong>SPORTS</strong><span>スポーツ</span></div><div class="ss-genre"><strong>HOW-TO</strong><span>ハウツー</span></div><div class="ss-genre"><strong>YOUR IDEA</strong><span>あなたのアイデア</span></div></div></div><div class="ss-role"><div class="ss-role-head"><div><small>06 / END-TO-END FLOW</small><h3 class="ss-title">サイト運営の流れ</h3></div></div><div class="ss-flow"><div class="ss-step"><em>01</em><b>販売者登録</b><span>販売者が参加</span></div><div class="ss-step"><em>02</em><b>作品登録</b><span>商品・動画を登録</span></div><div class="ss-step"><em>03</em><b>販売</b><span>購入者へ提供</span></div><div class="ss-step"><em>04</em><b>購入・決済</b><span>購入後ライブラリへ</span></div><div class="ss-step"><em>05</em><b>視聴・管理</b><span>購入者と運営者が管理</span></div></div></div><div class="ss-custom"><strong>動画販売ビジネスを、あなたのブランドへ。</strong><p>「動画を販売する・購入する・運営する」をひとつにつなぎ、見た目だけではなく機能まで紹介できるデモとして構成しています。</p></div></div></section>`;

function inject(html) {
  if (!html.includes('id="live-visual-fix"')) html = html.replace('</head>', `${visualFix}</head>`);
  html = html.replace('作品との新しい出会い', '作品との出会いを、もっと自由に。');
  if (!html.includes('href="/system-guide.html"')) {
    const navStart = html.indexOf('<nav');
    const navEnd = navStart >= 0 ? html.indexOf('</nav>', navStart) : -1;
    if (navStart >= 0 && navEnd >= 0) html = html.slice(0, navEnd) + nav + html.slice(navEnd);
  }
  if (!html.includes('class="system-showcase"')) {
    const marker = '<section class="trustbar">';
    const markerPos = html.indexOf(marker);
    if (markerPos >= 0) html = html.slice(0, markerPos) + featureShowcase + html.slice(markerPos);
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
