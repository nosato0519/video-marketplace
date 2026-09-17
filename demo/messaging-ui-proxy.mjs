import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['seller-account-settings-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

const messages = [
  { id: 1, from: '購入者 A', to: 'Demo Creator', product: '映像制作の基本テクニック', subject: '動画について質問があります', body: '購入した動画の第3章について、もう少し詳しく知りたいです。', time: '2026/09/17 14:12', status: '未返信' },
  { id: 2, from: 'Demo Creator', to: '購入者 B', product: '動画編集ワークフロー実践', subject: 'お問い合わせありがとうございます', body: 'ご質問ありがとうございます。該当箇所は第5章の補足をご確認ください。', time: '2026/09/16 18:40', status: '返信済み' },
];

const supportThreads = [
  { id: 101, subject: '振込について確認したい', category: '売上・振込', body: '今月の振込予定額について確認したいです。', time: '2026/09/17 10:20', status: '対応中', reply: 'お問い合わせありがとうございます。現在、確認中です。' },
  { id: 102, subject: '商品審査について', category: '商品審査', body: '審査結果が出るまでの流れを確認したいです。', time: '2026/09/15 16:05', status: '解決済み', reply: '審査完了後、登録メールアドレスへ通知されます。' },
];

const STYLE = `<style>
*{box-sizing:border-box}body{margin:0;background:#08090b;color:#f4f1eb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{text-decoration:none;color:inherit}.wrap{max-width:1080px;margin:auto;padding:48px 24px 90px}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:1px solid #29282a;padding-bottom:22px}.eyebrow{font-size:10px;letter-spacing:.24em;color:#c6a864;font-weight:800}.top h1{font-size:38px;letter-spacing:-.04em;margin:16px 0 8px}.lead{color:#99958f;font-size:12px;line-height:1.8;margin:0 0 28px}.back{font-size:11px;color:#aaa6a0;white-space:nowrap}.panel{border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:24px;margin-top:16px}.head{display:flex;justify-content:space-between;align-items:center;gap:16px;border-bottom:1px solid #302f34;padding-bottom:15px}.head h2{font-size:17px;margin:0}.tag{font-size:8px;letter-spacing:.14em;color:#c6a864}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.item{display:block;padding:18px 0;border-bottom:1px solid #29282d}.item:last-child{border-bottom:0}.meta{display:flex;justify-content:space-between;gap:15px;color:#77736e;font-size:9px}.item strong{display:block;font-size:13px;margin:8px 0}.item p{color:#aaa6a0;font-size:10px;line-height:1.8;margin:0}.badge{display:inline-block;padding:5px 8px;border:1px solid #5b4b2d;color:#d9b45f;font-size:8px;white-space:nowrap}.badge.ok{border-color:#3f5944;color:#9fc3a4}.form-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field label{display:block;color:#77736e;font-size:9px;margin-bottom:7px}.field input,.field textarea,.field select{width:100%;background:#0b0c0f;border:1px solid #3a3940;color:#eee;padding:11px;font:inherit}.field textarea{min-height:130px;resize:vertical}.full{grid-column:1/-1}.btn{width:100%;margin-top:16px;padding:12px;border:1px solid #5b4b2d;background:#15130f;color:#d9b45f;cursor:pointer;font:inherit}.btn.secondary{border-color:#3e3d43;background:#111216;color:#e9e4dc}.note{padding:15px;border:1px solid rgba(198,168,100,.3);background:#12110e;color:#99958f;font-size:10px;line-height:1.8;margin-top:16px}.nav-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:16px}.nav-cards a{border:1px solid #35333a;background:#111216;padding:15px;text-align:center;color:#ddd7cc;font-size:10px}.nav-cards a:hover{border-color:#c6a864;color:#d9b45f}.thread{border-top:1px solid #29282d;padding:18px 0}.thread:first-child{border-top:0}.thread h3{font-size:13px;margin:8px 0}.thread p{color:#aaa6a0;font-size:10px;line-height:1.8;margin:6px 0}.reply{margin-top:12px;padding:12px;border-left:2px solid #5b4b2d;background:#101114;color:#cfc9bf;font-size:10px;line-height:1.8}.admin-table{width:100%;border-collapse:collapse}.admin-table th,.admin-table td{padding:12px 8px;border-bottom:1px solid #29282d;text-align:left;font-size:9px}.admin-table th{color:#77736e}.admin-table td{color:#e9e4dc}.product-context{padding:13px 15px;border:1px solid #3b3935;background:#111216;color:#aaa6a0;font-size:10px}.product-context strong{color:#e9e4dc}@media(max-width:760px){.wrap{padding:36px 18px 70px}.top{display:block}.top h1{font-size:30px}.back{display:inline-block;margin-top:14px}.grid,.form-grid,.nav-cards{grid-template-columns:1fr}.full{grid-column:auto}.admin-table{min-width:720px}.table-wrap{overflow-x:auto}}
</style>`;

const NAV_STYLE = `<style id="message-nav-ui">.message-nav-card{margin-top:16px;border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:20px 22px}.message-nav-card h3{margin:0;font-size:15px}.message-nav-card p{margin:7px 0 14px;color:#888;font-size:9px;line-height:1.7}.message-nav-card a{display:block;border:1px solid #45434a;padding:11px;text-align:center;color:#c6a864;font-size:10px;text-decoration:none;margin-top:8px}.message-nav-card a:hover{border-color:#c6a864;background:#15130f}</style>`;

function layout(title, eyebrow, content, back='/pages/creator-studio.html') {
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Video Marketplace</title>${STYLE}</head><body><main class="wrap"><div class="top"><div><div class="eyebrow">${eyebrow}</div><h1>${title}</h1></div><a class="back" href="${back}">← 戻る</a></div>${content}</main></body></html>`;
}

function buyerMessages(url){
  const product = new URL(url,'http://localhost').searchParams.get('product');
  const context = product ? `<div class="product-context"><strong>商品について販売者へ質問</strong><br>対象商品：${product}</div>` : '';
  return layout('販売者へのメッセージ','BUYER / MESSAGES',`${context}<section class="panel"><div class="head"><h2>メッセージ</h2><span class="tag">BUYER INBOX</span></div>${messages.map(m=>`<div class="thread"><div class="meta"><span>${m.from} → ${m.to}</span><span>${m.time}</span></div><h3>${m.subject}</h3><p>${m.product}</p><p>${m.body}</p><span class="badge ${m.status==='返信済み'?'ok':''}">${m.status}</span></div>`).join('')}</section><section class="panel"><div class="head"><h2>販売者へ新しいメッセージ</h2><span class="tag">NEW MESSAGE</span></div><form onsubmit="event.preventDefault();alert('デモ版：メッセージを送信しました。')"><div class="form-grid"><div class="field"><label>対象商品</label><input value="${product||'映像制作の基本テクニック'}"></div><div class="field"><label>件名</label><input value="動画について質問があります"></div><div class="field full"><label>メッセージ</label><textarea placeholder="販売者への質問・確認内容を入力してください"></textarea></div></div><button class="btn" type="submit">販売者へ送信する</button></form></section><div class="note">購入者から販売者への商品問い合わせを想定したデモです。実運用版ではログインユーザー・購入権限・販売者ID・商品IDを紐付けて保存します。</div><div class="nav-cards"><a href="/pages/account.html">購入者アカウントへ</a><a href="/pages/messages.html?role=seller">販売者側で確認</a><a href="/pages/product-detail.html?product=${encodeURIComponent(product||'映像制作の基本テクニック')}">商品詳細へ戻る</a></div>`,'/pages/account.html');
}

function sellerMessages(){
  return layout('購入者からのメッセージ','SELLER / MESSAGES',`<section class="panel"><div class="head"><h2>受信トレイ</h2><span class="tag">BUYER MESSAGES</span></div>${messages.filter(m=>m.to==='Demo Creator').map(m=>`<div class="thread"><div class="meta"><span>${m.from} → ${m.to}</span><span>${m.time}</span></div><h3>${m.subject}</h3><p>商品：${m.product}</p><p>${m.body}</p><span class="badge">${m.status}</span><form onsubmit="event.preventDefault();alert('デモ版：購入者へ返信しました。')"><div class="field" style="margin-top:12px"><label>返信</label><textarea placeholder="購入者への返信を入力してください"></textarea></div><button class="btn" type="submit">返信する</button></form></div>`).join('')}</section><div class="nav-cards"><a href="/pages/creator-studio.html">Creator Studioへ</a><a href="/pages/support.html">運営への問い合わせ</a><a href="/pages/messages.html?role=buyer">購入者メッセージ画面</a></div>`);
}

function supportPage(){
  return layout('運営への問い合わせ','SELLER / SUPPORT',`<section class="panel"><div class="head"><h2>新しい問い合わせ</h2><span class="tag">CONTACT ADMIN</span></div><form onsubmit="event.preventDefault();alert('デモ版：運営への問い合わせを送信しました。')"><div class="form-grid"><div class="field"><label>問い合わせカテゴリ</label><select><option>売上・振込</option><option>商品審査</option><option>アカウント</option><option>システム</option><option>その他</option></select></div><div class="field"><label>件名</label><input value="お問い合わせ"></div><div class="field full"><label>内容</label><textarea placeholder="運営への問い合わせ内容を入力してください"></textarea></div></div><button class="btn" type="submit">運営へ送信する</button></form></section><section class="panel"><div class="head"><h2>問い合わせ履歴</h2><span class="tag">SUPPORT HISTORY</span></div>${supportThreads.map(t=>`<div class="thread"><div class="meta"><span>${t.category} / ${t.time}</span><span class="badge ${t.status==='解決済み'?'ok':''}">${t.status}</span></div><h3>${t.subject}</h3><p>${t.body}</p><div class="reply"><strong>運営からの返信</strong><br>${t.reply}</div></div>`).join('')}</section><div class="nav-cards"><a href="/pages/creator-studio.html">Creator Studioへ</a><a href="/pages/messages.html?role=seller">購入者メッセージ</a><a href="/pages/admin-support.html">運営側の管理画面</a></div>`);
}

function adminSupportPage(){
  return layout('問い合わせ管理','ADMIN / SUPPORT',`<section class="panel"><div class="head"><h2>問い合わせ一覧</h2><span class="tag">SUPPORT MANAGEMENT</span></div><div class="table-wrap"><table class="admin-table"><thead><tr><th>日時</th><th>販売者</th><th>カテゴリ</th><th>件名</th><th>状態</th><th>操作</th></tr></thead><tbody>${supportThreads.map(t=>`<tr><td>${t.time}</td><td>Demo Creator</td><td>${t.category}</td><td>${t.subject}</td><td>${t.status}</td><td><button type="button" onclick="alert('デモ版：問い合わせ詳細を開きます。')">確認</button></td></tr>`).join('')}</tbody></table></div></section><section class="panel"><div class="head"><h2>返信</h2><span class="tag">ADMIN REPLY</span></div><form onsubmit="event.preventDefault();alert('デモ版：販売者へ返信しました。')"><div class="form-grid"><div class="field"><label>対象</label><input value="Demo Creator / 振込について確認したい" readonly></div><div class="field"><label>ステータス</label><select><option>対応中</option><option>解決済み</option></select></div><div class="field full"><label>返信内容</label><textarea>お問い合わせありがとうございます。確認のうえ、改めてご案内いたします。</textarea></div></div><button class="btn" type="submit">販売者へ返信する</button></form></section><div class="note">運営側では販売者からの問い合わせを一覧で管理し、対応状況と返信履歴を確認できます。</div>`,'/pages/creator-studio.html');
}

function injectNavigation(html, pathname){
  const cards = pathname==='/pages/creator-studio.html' ? `<section class="message-nav-card"><h3>メッセージ・運営サポート</h3><p>購入者からの問い合わせ対応と、運営への問い合わせを管理できます。</p><a href="/pages/messages.html?role=seller">購入者からのメッセージ →</a><a href="/pages/support.html">運営への問い合わせ →</a></section>` : pathname==='/pages/account.html' ? `<section class="message-nav-card"><h3>販売者へのメッセージ</h3><p>購入した動画について販売者へ質問・確認を送れます。</p><a href="/pages/messages.html?role=buyer">メッセージを確認・送信 →</a></section>` : /product-detail\.html$/.test(pathname) ? `<section class="message-nav-card"><h3>販売者へ質問する</h3><p>この動画について販売者に質問・確認ができます。</p><a href="/pages/messages.html?role=buyer&product=動画についての質問">販売者にメッセージを送る →</a></section>` : /admin/i.test(pathname) ? `<section class="message-nav-card"><h3>問い合わせ管理</h3><p>販売者からの問い合わせを確認し、返信・対応状況を管理できます。</p><a href="/pages/admin-support.html">問い合わせ管理を開く →</a></section>` : '';
  if(!cards || !/<body[\s\S]*<\/body>/i.test(html)) return html;
  return html.replace(/<\/main>/i,cards+'</main>');
}

const server=createServer((req,res)=>{
  const pathname=(req.url||'/').split('?')[0];
  if(req.method==='GET'&&pathname==='/pages/messages.html'){
    const url=req.url||'';
    const role=new URL(url,'http://localhost').searchParams.get('role')||'buyer';
    const body=role==='seller'?sellerMessages():buyerMessages(url);
    const buf=Buffer.from(body,'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':String(buf.length),'cache-control':'no-store'});res.end(buf);return;
  }
  if(req.method==='GET'&&pathname==='/pages/support.html'){
    const buf=Buffer.from(supportPage(),'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':String(buf.length),'cache-control':'no-store'});res.end(buf);return;
  }
  if(req.method==='GET'&&pathname==='/pages/admin-support.html'){
    const buf=Buffer.from(adminSupportPage(),'utf8');res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':String(buf.length),'cache-control':'no-store'});res.end(buf);return;
  }
  const upstream=httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers},response=>{
    const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{
      let body=Buffer.concat(chunks);
      const type=String(response.headers['content-type']||'');
      if(req.method==='GET'&&type.includes('text/html')){
        body=Buffer.from(injectNavigation(body.toString('utf8'),pathname),'utf8');
      }
      const headers={...response.headers,'content-length':String(body.length),'cache-control':'no-store, no-cache, must-revalidate, proxy-revalidate',pragma:'no-cache',expires:'0'};
      delete headers['transfer-encoding'];res.writeHead(response.statusCode||200,headers);res.end(body);
    });
  });
  upstream.on('error',error=>{res.writeHead(502,{'content-type':'text/plain; charset=utf-8'});res.end(`Upstream unavailable: ${error.message}`)});
  req.pipe(upstream);
});

server.listen(port,'0.0.0.0',()=>console.log(`VIDEO MARKETPLACE messaging proxy listening on ${port}`));
process.on('SIGTERM',()=>process.exit(0));
process.on('SIGINT',()=>process.exit(0));
