import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 4173);
const upstreamPort = port === 4173 ? 4174 : 4173;

spawn(process.execPath, ['launcher.mjs'], {
  cwd: new URL('.', import.meta.url).pathname,
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const SYSTEM_BLOCK = `<section class="system-showcase-force" id="system-features-force"><div class="ssf-inner"><div class="ssf-kicker">COMPLETE VIDEO MARKETPLACE SYSTEM</div><h2>動画販売に必要なすべてを、<br><em>ひとつのシステムに。</em></h2><p class="ssf-lead">販売者・購入者・運営者。それぞれに必要な機能をひとつにまとめた、動画販売マーケットプレイスシステムです。動画の登録・販売、会員登録・購入、決済、購入後の視聴、売上管理、サイト運営まで、一連の流れをシステム内で完結できます。</p><div class="ssf-roles"><article><b>01 / SELLER</b><strong>販売者は、動画を販売。</strong><p>販売者はアカウントを登録し、動画・商品を登録して販売できます。販売状況や売上も管理できます。</p><div class="ssf-tags"><span>会員登録</span><span>商品登録</span><span>動画販売</span><span>売上管理</span></div></article><article><b>02 / BUYER</b><strong>購入者は、動画を購入。</strong><p>購入者は会員登録後、動画を探して購入。購入した作品はマイライブラリから視聴・ダウンロードできます。</p><div class="ssf-tags"><span>会員登録</span><span>検索</span><span>購入・決済</span><span>視聴・DL</span></div></article><article><b>03 / ADMIN</b><strong>あなたは、そのサイトを運営。</strong><p>運営者は管理画面からユーザー、販売者、商品、動画、注文、決済、売上、出金などを一元管理できます。</p><div class="ssf-tags"><span>ユーザー管理</span><span>商品管理</span><span>決済管理</span><span>運営管理</span></div></article></div><div class="ssf-detail-title"><span>FEATURES</span><strong>動画販売を支える、充実した機能。</strong></div><div class="ssf-grid"><article><b>BUYER</b><strong>購入者機能</strong><span>会員登録・ログイン、プロフィール、動画検索、キーワード検索、カテゴリー閲覧、商品一覧、商品詳細、作品プレビュー、カート、購入、決済、購入確認、マイライブラリ、購入履歴、購入済み作品の視聴、ダウンロード、視聴ページ、保護された動画配信。</span></article><article><b>CREATOR</b><strong>販売者・クリエイター機能</strong><span>販売者登録、販売者プロフィール、商品登録、動画登録・アップロード、サムネイル・商品画像、タイトル・説明、カテゴリー設定、価格設定、公開・非公開管理、商品管理、販売状況確認、売上確認、売上管理、出金申請、販売者向け導線。</span></article><article><b>ADMIN</b><strong>運営・管理機能</strong><span>管理画面、ユーザー管理、販売者管理、販売者承認、商品管理、商品審査・公開管理、動画管理、カテゴリー管理、注文管理、決済管理、売上管理、出金管理、メディア管理、サイト管理、セキュリティ管理、運営全体の一元管理。</span></article><article><b>SEARCH &amp; DISCOVERY</b><strong>探す・見つける機能</strong><span>キーワード検索、カテゴリー、人気作品、注目作品、作品一覧、作品詳細、クリエイター紹介、クリエイター一覧、特集・スポットライト、関連コンテンツ、目的の動画へスムーズにたどり着ける導線。</span></article><article><b>ORDER &amp; PAYMENT</b><strong>購入・決済機能</strong><span>カート、注文作成、購入フロー、決済処理、注文完了、購入履歴、購入権限の付与、購入後のライブラリ反映、購入済みコンテンツへのアクセス管理。</span></article><article><b>MEDIA DELIVERY</b><strong>視聴・配信機能</strong><span>購入済み動画の視聴、保護されたメディアアクセス、ダウンロード対応、未購入コンテンツへのアクセス制御、マイライブラリからの視聴導線、購入権限に応じたコンテンツ提供。</span></article><article><b>RESPONSIVE &amp; UX</b><strong>使いやすいサイト設計</strong><span>PC・タブレット・スマートフォンに対応したレスポンシブUI、検索・カテゴリー・購入・視聴までの導線、購入者・販売者・運営者それぞれに分かりやすい画面構成。</span></article><article><b>CUSTOMIZE</b><strong>自由なカスタマイズ</strong><span>ロゴ、サイト名、カラー、フォント、画像、動画、カテゴリー、商品情報、メニュー、トップページ、文章、ボタン、コンテンツ、セクション構成、ブランドの世界観、全体デザインまで自由に変更できます。</span></article></div><div class="ssf-bottom"><div><strong>このまま運営できる。カスタマイズも、自由。</strong><span>完成した土台を、そのまま自分のサービスへ。教育・オンライン講座・エンタメ・クリエイター作品・フィットネス・音楽・映像作品・ビジネス・企業研修など、さまざまなジャンルの動画販売サイトに展開できます。</span></div><div class="ssf-badge"><b>READY TO OPERATE</b><small>そのまま運営 ＋ 自由にカスタム</small></div></div></div></section>`;

const STYLE = `<style id="force-final-visual">.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1.25)!important;transform-origin:left top!important}.hero-mosaic{transform:scale(1.25)!important;transform-origin:top right!important}.system-showcase-force{display:block!important;position:relative!important;background:linear-gradient(180deg,#090a0d 0%,#111216 100%);border-top:1px solid rgba(183,155,91,.38);border-bottom:1px solid #29282a;padding:86px 6vw 92px;color:#f4f1eb}.ssf-inner{max-width:1280px;margin:0 auto}.ssf-kicker{font-size:10px;letter-spacing:.28em;color:#c6a864;font-weight:800}.system-showcase-force h2{font-size:clamp(38px,4.6vw,64px);line-height:1.1;letter-spacing:-.04em;margin:14px 0 20px}.system-showcase-force h2 em{font-style:normal;color:#d5ba79}.ssf-lead{max-width:980px;color:#aaa6a0;font-size:15px;line-height:1.95;margin:0}.ssf-roles{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:42px}.ssf-roles article{padding:32px;border:1px solid #3b3935;background:linear-gradient(145deg,#1a1a1d,#101114);min-height:265px}.ssf-roles b{font-size:10px;letter-spacing:.2em;color:#c6a864}.ssf-roles strong{display:block;font-size:24px;line-height:1.35;margin:14px 0}.ssf-roles p{color:#aaa6a0;font-size:13px;line-height:1.85;margin:0}.ssf-tags{display:flex;flex-wrap:wrap;gap:7px;margin-top:20px}.ssf-tags span{font-size:10px;padding:7px 10px;border:1px solid #45434a;color:#ddd7cc;background:#111216}.ssf-detail-title{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-top:62px;padding-bottom:18px;border-bottom:1px solid #343238}.ssf-detail-title span{font-size:10px;letter-spacing:.24em;color:#c6a864;font-weight:800}.ssf-detail-title strong{font-size:22px}.ssf-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-top:22px}.ssf-grid article{min-height:225px;padding:28px;border:1px solid #343238;background:linear-gradient(145deg,#16171b,#0e0f12);display:flex;flex-direction:column}.ssf-grid b{font-size:10px;letter-spacing:.2em;color:#b79b5b}.ssf-grid strong{font-size:20px;margin:13px 0 12px}.ssf-grid span{color:#99958f;font-size:12px;line-height:1.9}.ssf-bottom{margin-top:28px;padding:27px 30px;border:1px solid rgba(183,155,91,.45);background:linear-gradient(120deg,#18150f,#101114);display:flex;justify-content:space-between;gap:30px;align-items:center}.ssf-bottom>div:first-child{flex:1}.ssf-bottom strong{display:block;font-size:22px}.ssf-bottom span{display:block;max-width:760px;color:#aaa6a0;font-size:12px;line-height:1.8;margin-top:8px}.ssf-badge{min-width:245px;text-align:center;padding:16px 18px;border:1px solid rgba(198,168,100,.5);background:#0d0e11}.ssf-badge b{display:block;font-size:10px;letter-spacing:.18em;color:#c6a864}.ssf-badge small{display:block;margin-top:7px;color:#ddd7cc;font-size:11px}@media(max-width:1100px){.ssf-grid{grid-template-columns:repeat(2,1fr)}}@media(max-width:900px){.hero{height:720px!important;min-height:720px!important}.ssf-roles{grid-template-columns:1fr}.ssf-detail-title{display:block}.ssf-detail-title strong{display:block;margin-top:10px}.ssf-bottom{display:block}.ssf-badge{margin-top:20px;max-width:320px}.ssf-bottom span{max-width:none}}@media(max-width:600px){.hero{height:680px!important;min-height:680px!important}.hero-copy{transform:scale(1)!important}.hero-mosaic{transform:scale(.9)!important}.system-showcase-force{padding:65px 20px}.ssf-grid{grid-template-columns:1fr}.system-showcase-force h2{font-size:36px}.ssf-roles article{padding:25px}.ssf-detail-title strong{font-size:19px}.ssf-bottom{padding:24px}.ssf-badge{min-width:0;width:100%}}</style>`;

function removeSectionContaining(html, marker) {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return html;
  const start = html.lastIndexOf('<section', markerIndex);
  const end = html.indexOf('</section>', markerIndex);
  if (start < 0 || end < 0) return html;
  return html.slice(0, start) + html.slice(end + 10);
}

function finalize(html) {
  html = html.replaceAll('VIDORA', 'VIDEO MARKETPLACE');
  html = removeSectionContaining(html, 'system-showcase');
  html = removeSectionContaining(html, 'system-guide-teaser');
  html = removeSectionContaining(html, 'id="guide"');
  html = html.replaceAll('href="#guide"', 'href="#system-features-force"');

  const heroStart = html.indexOf('<section class="hero"');
  const heroEnd = heroStart >= 0 ? html.indexOf('</section>', heroStart) : -1;
  if (heroStart >= 0 && heroEnd >= 0) {
    const insertAt = heroEnd + 10;
    html = html.slice(0, insertAt) + SYSTEM_BLOCK + html.slice(insertAt);
  } else {
    const bodyEnd = html.lastIndexOf('</body>');
    if (bodyEnd >= 0) html = html.slice(0, bodyEnd) + SYSTEM_BLOCK + html.slice(bodyEnd);
  }

  return html.replace('</head>', STYLE + '</head>');
}

function proxy(req, res) {
  const options = { hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers };
  const upstream = httpRequest(options, (upstreamRes) => {
    const chunks = [];
    upstreamRes.on('data', (chunk) => chunks.push(chunk));
    upstreamRes.on('end', () => {
      const body = Buffer.concat(chunks);
      const isHome = req.method === 'GET' && (req.url === '/' || req.url === '/index.html');
      if (isHome && String(upstreamRes.headers['content-type'] || '').includes('text/html')) {
        const html = finalize(body.toString('utf8'));
        const headers = { ...upstreamRes.headers, 'content-type': 'text/html; charset=utf-8', 'content-length': Buffer.byteLength(html), 'cache-control': 'no-store', 'x-demo-version': '20260907-v28' };
        delete headers['transfer-encoding'];
        res.writeHead(upstreamRes.statusCode || 200, headers);
        res.end(html);
      } else {
        res.writeHead(upstreamRes.statusCode || 200, upstreamRes.headers);
        res.end(body);
      }
    });
  });
  upstream.on('error', (err) => {
    res.statusCode = 502;
    res.end(`Upstream error: ${err.message}`);
  });
  req.pipe(upstream);
}

createServer(proxy).listen(port, '0.0.0.0', () => {
  console.log(`VIDEO MARKETPLACE force-page listening on http://0.0.0.0:${port}`);
});
