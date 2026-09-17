import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['analytics-ui-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

const STYLE = `<style>
*{box-sizing:border-box}body{margin:0;background:#08090b;color:#f4f1eb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{text-decoration:none;color:inherit}.account{max-width:1080px;margin:auto;padding:48px 24px 90px}.account-top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:1px solid #29282a;padding-bottom:22px}.eyebrow{font-size:10px;letter-spacing:.24em;color:#c6a864;font-weight:800}.account h1{font-size:38px;letter-spacing:-.04em;margin:16px 0 8px}.lead{color:#99958f;font-size:12px;line-height:1.8;margin:0 0 28px}.back{font-size:11px;color:#aaa6a0;white-space:nowrap}.notice{padding:17px 19px;border:1px solid rgba(198,168,100,.35);background:linear-gradient(120deg,#17140e,#101114);color:#aaa6a0;font-size:10px;line-height:1.9;margin-top:18px}.notice strong{display:block;color:#d9b45f;margin-bottom:5px;font-size:11px}.panel{border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:26px;margin-top:16px}.head{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #302f34;padding-bottom:15px}.head h2{font-size:17px;margin:0}.tag{font-size:8px;letter-spacing:.14em;color:#c6a864}.field{display:grid;grid-template-columns:190px 1fr;gap:20px;padding:15px 0;border-bottom:1px solid #29282d}.field:last-child{border-bottom:0}.label{font-size:10px;color:#77736e}.value{font-size:12px;color:#e9e4dc;line-height:1.8}.value input,.value textarea,.value select{width:100%;box-sizing:border-box;background:#0b0c0f;border:1px solid #3a3940;color:#eee;padding:10px;font:inherit}.value textarea{min-height:86px;resize:vertical}.btn{margin-top:16px;width:100%;padding:12px;border:1px solid #5b4b2d;background:#15130f;color:#d9b45f;cursor:pointer;font:inherit}.btn.secondary{border-color:#3e3d43;background:#111216;color:#e9e4dc}.columns{display:grid;grid-template-columns:1fr 1fr;gap:16px}.status{display:inline-block;border:1px solid #3f5944;color:#9fc3a4;padding:6px 9px;font-size:9px}.warning{display:inline-block;border:1px solid #6d5b35;color:#d9b45f;padding:6px 9px;font-size:9px}.small{color:#77736e;font-size:9px;line-height:1.8;margin-top:8px}.divider{height:1px;background:#29282d;margin:8px 0}.danger{border-color:#5a3333;background:#130e0e;color:#d99a9a}.meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 22px}.check-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:13px 0;border-bottom:1px solid #29282d}.check-row:last-child{border-bottom:0}.switch{color:#d9b45f;font-size:10px}.footer-note{margin-top:18px;color:#77736e;font-size:9px;line-height:1.8}@media(max-width:760px){.account{padding:36px 18px 70px}.account h1{font-size:30px}.account-top{display:block}.back{display:inline-block;margin-top:14px}.columns{grid-template-columns:1fr}.field{grid-template-columns:1fr;gap:6px}.meta-grid{grid-template-columns:1fr}.panel{padding:21px}}
</style>`;

function accountPage(){
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>会員情報・アカウント設定 | Video Marketplace</title>${STYLE}</head><body><main class="account">
  <div class="account-top"><div><div class="eyebrow">SELLER / ACCOUNT</div><h1>会員情報・アカウント設定</h1><p class="lead">公開プロフィール、登録情報、セキュリティ、通知、アカウント管理をまとめて設定できます。</p></div><a class="back" href="/pages/creator-studio.html">← Creator Studioへ戻る</a></div>

  <div class="notice"><strong>公開範囲について</strong>購入者に表示されるのは「公開プロフィール」に設定した情報のみです。氏名・電話番号・住所・生年月日・メールアドレスなどの登録情報は購入者には公開されず、販売者本人と運営者が管理します。</div>

  <section class="panel"><div class="head"><h2>公開プロフィール</h2><span class="tag">PUBLIC PROFILE</span></div>
    <div class="field"><span class="label">クリエイター名</span><span class="value"><input value="Demo Creator"><div class="small">商品ページなどで購入者に表示される名前です。</div></span></div>
    <div class="field"><span class="label">プロフィール画像</span><span class="value"><input value="demo-creator.jpg"><div class="small">購入者に表示されるプロフィール画像です。</div></span></div>
    <div class="field"><span class="label">自己紹介</span><span class="value"><textarea>映像制作・動画編集を中心に活動しています。</textarea><div class="small">購入者に公開される紹介文です。コメント欄ではなくプロフィールとして管理します。</div></span></div>
    <button class="btn" type="button" onclick="alert('デモ版では入力内容を保存しません。')">公開プロフィールを保存</button>
  </section>

  <div class="columns">
    <section class="panel"><div class="head"><h2>登録情報</h2><span class="tag">PRIVATE</span></div>
      <div class="field"><span class="label">氏名</span><span class="value"><input value="山田 太郎"></span></div>
      <div class="field"><span class="label">氏名カナ</span><span class="value"><input value="ヤマダ タロウ"></span></div>
      <div class="field"><span class="label">メールアドレス</span><span class="value"><input value="seller@example.com" type="email"></span></div>
      <div class="field"><span class="label">電話番号</span><span class="value"><input value="090-1234-5678"></span></div>
      <div class="field"><span class="label">郵便番号</span><span class="value"><input value="920-0000"></span></div>
      <div class="field"><span class="label">住所</span><span class="value"><input value="石川県金沢市"></span></div>
      <div class="field"><span class="label">生年月日</span><span class="value"><input value="1987-04-15" type="date"></span></div>
      <button class="btn" type="button" onclick="alert('デモ版では登録情報を保存しません。')">登録情報を保存</button>
      <div class="small">※本名・住所などは購入者には公開されません。</div>
    </section>

    <section class="panel"><div class="head"><h2>本人確認・会員情報</h2><span class="tag">ACCOUNT STATUS</span></div>
      <div class="field"><span class="label">本人確認</span><span class="value"><span class="status">確認済み</span></span></div>
      <div class="field"><span class="label">会員ID</span><span class="value">SELLER-000184</span></div>
      <div class="field"><span class="label">登録日</span><span class="value">2026年4月12日</span></div>
      <div class="field"><span class="label">最終更新日時</span><span class="value">2026年9月17日 15:02</span></div>
      <div class="field"><span class="label">アカウント状態</span><span class="value"><span class="status">有効</span></span></div>
      <div class="notice"><strong>購入者には公開されません</strong>本人確認・会員ID・登録状態などは運営管理に使用する情報です。</div>
    </section>
  </div>

  <section class="panel"><div class="head"><h2>ログイン・セキュリティ</h2><span class="tag">SECURITY</span></div>
    <div class="field"><span class="label">メールアドレス</span><span class="value">seller@example.com</span></div>
    <div class="field"><span class="label">パスワード</span><span class="value">••••••••••••</span></div>
    <div class="field"><span class="label">2段階認証</span><span class="value"><span class="warning">未設定</span></span></div>
    <div class="field"><span class="label">最終ログイン</span><span class="value">2026年9月17日 14:48 / PC</span></div>
    <div class="field"><span class="label">ログイン履歴</span><span class="value">直近のログイン履歴を確認できます。</span></div>
    <button class="btn secondary" type="button" onclick="alert('デモ版ではセキュリティ設定を変更しません。')">パスワード・セキュリティ設定を変更</button>
  </section>

  <section class="panel"><div class="head"><h2>通知設定</h2><span class="tag">NOTIFICATIONS</span></div>
    <div class="check-row"><span><strong>新規購入通知</strong><br><span class="small">動画が購入されたときに通知</span></span><span class="switch">ON</span></div>
    <div class="check-row"><span><strong>商品審査結果通知</strong><br><span class="small">公開・差し戻しなどの審査結果</span></span><span class="switch">ON</span></div>
    <div class="check-row"><span><strong>振込通知</strong><br><span class="small">振込予定・振込完了のお知らせ</span></span><span class="switch">ON</span></div>
    <div class="check-row"><span><strong>システムのお知らせ</strong><br><span class="small">重要なメンテナンス・運営連絡</span></span><span class="switch">ON</span></div>
    <button class="btn" type="button" onclick="alert('デモ版では通知設定を保存しません。')">通知設定を保存</button>
  </section>

  <section class="panel"><div class="head"><h2>アカウント管理</h2><span class="tag">ACCOUNT MANAGEMENT</span></div>
    <div class="field"><span class="label">アカウント状態</span><span class="value">有効</span></div>
    <div class="field"><span class="label">退会</span><span class="value">退会すると販売中の商品、売上、振込状況などに影響するため、確認画面を経由して手続きを行います。</span></div>
    <button class="btn danger" type="button" onclick="alert('デモ版では退会処理を実行しません。')">退会手続きを開始</button>
  </section>

  <div class="footer-note">デモ版では架空の会員情報を使用しています。入力欄・設定変更は実際のデータベースには保存されません。実運用版では各情報を認証・権限管理のもとで保存します。</div>
</main></body></html>`;
}

const server=createServer((req,res)=>{
  const pathname=(req.url||'/').split('?')[0];
  if(req.method==='GET'&&pathname==='/pages/seller-account.html'){
    const body=Buffer.from(accountPage(),'utf8');
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':String(body.length),'cache-control':'no-store'});
    res.end(body);return;
  }
  const upstream=httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers},response=>{
    const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{const body=Buffer.concat(chunks);const headers={...response.headers,'content-length':String(body.length),'cache-control':'no-store, no-cache, must-revalidate, proxy-revalidate',pragma:'no-cache',expires:'0'};delete headers['transfer-encoding'];res.writeHead(response.statusCode||200,headers);res.end(body)});
  });
  upstream.on('error',error=>{res.writeHead(502,{'content-type':'text/plain; charset=utf-8'});res.end(`Upstream unavailable: ${error.message}`)});
  req.pipe(upstream);
});

server.listen(port,'0.0.0.0',()=>console.log(`VIDEO MARKETPLACE seller account settings proxy listening on ${port}`));
process.on('SIGTERM',()=>process.exit(0));
process.on('SIGINT',()=>process.exit(0));
