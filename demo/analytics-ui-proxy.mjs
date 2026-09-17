import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['view-analytics-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

const FALLBACK = {
  daily: [
    { date: '今日', count: 6 },
    { date: '昨日', count: 4 },
    { date: '一昨日', count: 3 },
  ],
  monthly: [
    { month: '今月', count: 38 },
    { month: '先月', count: 29 },
    { month: '2か月前', count: 21 },
  ],
  yearly: [
    { year: '今年', count: 156 },
    { year: '前年', count: 118 },
    { year: '2年前', count: 74 },
  ],
};

const UI_FIX = `<script id="seller-analytics-period-fix">(()=>{\nconst boot=()=>{\n  const root=document.getElementById('viewAnalytics');\n  if(!root||root.dataset.periodFix==='1')return;\n  root.dataset.periodFix='1';\n  const list=root.querySelector('#viewAnalyticsList');\n  const buttons=[...root.querySelectorAll('[data-period]')];\n  if(!list||!buttons.length)return;\n  const fallback=${JSON.stringify(FALLBACK)};\n  let data=fallback;\n  const render=period=>{\n    const rows=(data[period]||[]);\n    list.innerHTML=rows.map(row=>'<div class="view-analytics-row"><span>'+row[period==='daily'?'date':period==='monthly'?'month':'year']+'</span><strong>'+Number(row.count).toLocaleString()+' 回</strong></div>').join('');\n    buttons.forEach(btn=>btn.classList.toggle('active',btn.dataset.period===period));\n  };\n  buttons.forEach(btn=>btn.addEventListener('click',()=>render(btn.dataset.period)));\n  fetch('/api/demo/view-analytics',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(result=>{\n    if(result && (result.daily?.length||result.monthly?.length||result.yearly?.length)){\n      data=result;\n      render(buttons.find(b=>b.classList.contains('active'))?.dataset.period||'daily');\n    }else render('daily');\n  }).catch(()=>render('daily'));\n};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();\nwindow.addEventListener('pageshow',boot);\n})();</script>`;

const PAYOUT_UI = `<script id="seller-payout-account-ui">(()=>{\nconst boot=()=>{\n  if(document.getElementById('sellerPayoutAccountLink'))return;\n  const payout=[...document.querySelectorAll('.side-stack .panel')].find(el=>/PAYOUT/.test(el.textContent||''));\n  if(!payout)return;\n  const link=document.createElement('a');\n  link.id='sellerPayoutAccountLink';\n  link.href='/pages/payout-settings.html';\n  link.textContent='振込先・受取設定 →';\n  link.style.cssText='display:block;margin-top:10px;text-align:center;border:1px solid #4a474d;padding:12px;font-size:10px;letter-spacing:.08em;color:#c6a864;text-decoration:none';\n  payout.appendChild(link);\n};\nif(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();\nwindow.addEventListener('pageshow',boot);\n})();</script>`;

const PAYOUT_STYLE = `<style>*{box-sizing:border-box}body{margin:0;background:#08090b;color:#f4f1eb;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit;text-decoration:none}.pay{max-width:980px;margin:0 auto;padding:48px 24px 90px}.top{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #29282a;padding-bottom:22px}.eyebrow{font-size:10px;letter-spacing:.24em;color:#c6a864;font-weight:800}.back{font-size:11px;color:#aaa6a0}.pay h1{font-size:38px;letter-spacing:-.04em;margin:16px 0 8px}.lead{color:#99958f;font-size:12px;line-height:1.8;margin:0 0 28px}.panel{border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:26px;margin-top:16px}.panel h2{font-size:17px;margin:0}.panel-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #302f34;padding-bottom:15px}.tag{font-size:8px;letter-spacing:.14em;color:#c6a864}.rows{margin-top:6px}.row{display:grid;grid-template-columns:190px 1fr;gap:20px;padding:15px 0;border-bottom:1px solid #29282d}.row:last-child{border-bottom:0}.label{font-size:10px;color:#77736e}.value{font-size:12px;color:#e9e4dc}.masked{letter-spacing:.12em}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.amount{font-size:30px;margin-top:14px}.muted{font-size:10px;color:#99958f;margin-top:6px}.status{display:inline-block;margin-top:14px;border:1px solid #6d5b35;color:#d9b45f;padding:7px 9px;font-size:9px}.note{padding:15px;border:1px solid rgba(198,168,100,.3);background:#12110e;color:#99958f;font-size:10px;line-height:1.8;margin-top:16px}.demo-button{margin-top:16px;width:100%;border:1px solid #4a474d;background:#111216;color:#f4f1eb;padding:12px;font-size:10px;cursor:pointer}.demo-button:hover{border-color:#c6a864;color:#d9b45f}.history{overflow:hidden}.history-table{width:100%;border-collapse:collapse;margin-top:8px}.history-table th,.history-table td{padding:14px 8px;border-bottom:1px solid #29282d;text-align:left;font-size:10px}.history-table th{color:#77736e;font-weight:600}.history-table td{color:#e9e4dc}.history-table td.amount-cell{text-align:right;font-size:12px;font-weight:700}.history-table td:last-child{text-align:right}.history-status{display:inline-block;border:1px solid #3f5944;color:#9fc3a4;padding:5px 8px;font-size:8px;white-space:nowrap}.history-foot{display:flex;justify-content:space-between;gap:20px;margin-top:14px;color:#77736e;font-size:9px}.history-foot strong{color:#d8d2ca}@media(max-width:700px){.pay{padding:36px 18px 70px}.pay h1{font-size:30px}.grid{grid-template-columns:1fr}.row{grid-template-columns:1fr;gap:6px}.history{overflow-x:auto}.history-table{min-width:620px}}</style>`;

function payoutPage(){return `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>振込先・受取設定 | Video Marketplace</title>${PAYOUT_STYLE}</head><body><main class="pay"><div class="top"><div><div class="eyebrow">SELLER / PAYOUT</div><h1>振込先・受取設定</h1><p class="lead">売上金を受け取るための振込先口座と、振込スケジュール・履歴を確認できます。</p></div><a class="back" href="/pages/creator-studio.html">← Creator Studioへ戻る</a></div><section class="panel"><div class="panel-head"><h2>振込先口座</h2><span class="tag">REGISTERED ACCOUNT</span></div><div class="rows"><div class="row"><span class="label">金融機関</span><span class="value">北陸デモ銀行</span></div><div class="row"><span class="label">支店</span><span class="value">金沢中央支店</span></div><div class="row"><span class="label">口座種別</span><span class="value">普通</span></div><div class="row"><span class="label">口座番号</span><span class="value masked">•••• 4821</span></div><div class="row"><span class="label">口座名義</span><span class="value">デモ クリエイター</span></div><div class="row"><span class="label">登録状態</span><span class="value">登録済み・利用可能</span></div><div class="row"><span class="label">最終更新日</span><span class="value">2026年9月1日</span></div></div><button class="demo-button" type="button" onclick="alert('デモ版では実際の口座変更は行いません。')">振込先を変更する</button></section><div class="grid"><section class="panel"><div class="panel-head"><h2>振込設定</h2><span class="tag">PAYOUT SCHEDULE</span></div><div class="rows"><div class="row"><span class="label">振込サイクル</span><span class="value">月1回</span></div><div class="row"><span class="label">次回振込予定</span><span class="value">2026年10月15日</span></div><div class="row"><span class="label">最低振込額</span><span class="value">¥5,000</span></div><div class="row"><span class="label">振込手数料</span><span class="value">¥250</span></div><div class="row"><span class="label">振込対象額</span><span class="value">¥74,800</span></div></div></section><section class="panel"><div class="panel-head"><h2>振込状況</h2><span class="tag">CURRENT STATUS</span></div><div class="amount">¥74,800</div><div class="muted">次回振込対象の予定額</div><span class="status">振込準備中</span><div class="note">売上履歴では販売内容と売上額を確認し、こちらでは「どの口座に・いつ・いくら振り込まれるか」を確認できます。</div></section></div><section class="panel history"><div class="panel-head"><h2>振込履歴</h2><span class="tag">PAYOUT HISTORY</span></div><table class="history-table"><thead><tr><th>振込日</th><th>対象期間</th><th>振込先</th><th>振込額</th><th>状態</th></tr></thead><tbody><tr><td>2026/09/15</td><td>2026年8月分</td><td>北陸デモ銀行 ****4821</td><td class="amount-cell">¥68,400</td><td><span class="history-status">振込済み</span></td></tr><tr><td>2026/08/15</td><td>2026年7月分</td><td>北陸デモ銀行 ****4821</td><td class="amount-cell">¥52,800</td><td><span class="history-status">振込済み</span></td></tr><tr><td>2026/07/15</td><td>2026年6月分</td><td>北陸デモ銀行 ****4821</td><td class="amount-cell">¥41,200</td><td><span class="history-status">振込済み</span></td></tr></tbody></table><div class="history-foot"><span>直近3回の振込実績を表示</span><span>累計振込額 <strong>¥162,400</strong></span></div></section><div class="note">デモ版では架空の金融機関・口座情報を使用しています。実際の銀行口座登録、振込処理、口座変更は行われません。</div></main></body></html>`}

const server = createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if(req.method==='GET'&&pathname==='/pages/payout-settings.html'){
    const body=Buffer.from(payoutPage(),'utf8');
    res.writeHead(200,{'content-type':'text/html; charset=utf-8','content-length':String(body.length),'cache-control':'no-store'});
    res.end(body);return;
  }
  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers,
  }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && pathname === '/pages/creator-studio.html' && response.statusCode === 200 && type.includes('text/html')) {
        body = Buffer.from(body.toString('utf8') + UI_FIX + PAYOUT_UI, 'utf8');
      }
      const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate', pragma: 'no-cache', expires: '0' };
      delete headers['transfer-encoding'];
      res.writeHead(response.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', error => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`Upstream unavailable: ${error.message}`);
  });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE analytics UI proxy listening on ${port}`));
const shutdown = () => process.exit(0);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
