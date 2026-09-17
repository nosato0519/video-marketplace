import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;
const views = [];

// Seed demo-only history so each period has a visibly different result.
const now = new Date();
for (let i = 1; i <= 6; i++) {
  const d = new Date(now);
  d.setDate(d.getDate() - i);
  for (let n = 0; n < 3 + (i % 3); n++) views.push(d.toISOString());
}
for (let i = 1; i <= 11; i++) {
  const d = new Date(now.getFullYear(), now.getMonth() - i, 12);
  for (let n = 0; n < 8 + (i % 5); n++) views.push(d.toISOString());
}
for (let i = 1; i <= 4; i++) {
  const d = new Date(now.getFullYear() - i, 6, 10);
  for (let n = 0; n < 20 + i * 4; n++) views.push(d.toISOString());
}

spawn(process.execPath, ['home-nav-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

function isToday(d, current) {
  return d.getFullYear() === current.getFullYear() && d.getMonth() === current.getMonth() && d.getDate() === current.getDate();
}
function isSameMonth(d, current) {
  return d.getFullYear() === current.getFullYear() && d.getMonth() === current.getMonth();
}
function isSameYear(d, current) {
  return d.getFullYear() === current.getFullYear();
}
function analytics() {
  const current = new Date();
  const daily = new Map();
  const monthly = new Map();
  const yearly = new Map();
  for (const value of views) {
    const d = new Date(value);
    const day = d.toISOString().slice(0, 10);
    const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const year = String(d.getFullYear());
    daily.set(day, (daily.get(day) || 0) + 1);
    monthly.set(month, (monthly.get(month) || 0) + 1);
    yearly.set(year, (yearly.get(year) || 0) + 1);
  }
  return {
    total: views.length,
    today: views.filter(v => isToday(new Date(v), current)).length,
    month: views.filter(v => isSameMonth(new Date(v), current)).length,
    year: views.filter(v => isSameYear(new Date(v), current)).length,
    daily: [...daily.entries()].sort().slice(-30).map(([date, count]) => ({ date, count })),
    monthly: [...monthly.entries()].sort().slice(-12).map(([month, count]) => ({ month, count })),
    yearly: [...yearly.entries()].sort().slice(-10).map(([year, count]) => ({ year, count })),
  };
}

const ANALYTICS_UI = `<style id="seller-view-analytics-style">
.view-analytics{margin-top:18px;border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:27px}.view-analytics-head{display:flex;justify-content:space-between;align-items:end;gap:20px;padding-bottom:16px;border-bottom:1px solid #302f34}.view-analytics-head strong{font-size:18px}.view-analytics-head span{font-size:9px;letter-spacing:.16em;color:#c6a864}.view-analytics-metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.view-analytics-metric{padding:18px;border:1px solid #302f34;background:#0b0c0e}.view-analytics-metric b{display:block;font-size:8px;letter-spacing:.16em;color:#c6a864}.view-analytics-metric strong{display:block;font-size:25px;margin-top:9px}.view-analytics-metric span{display:block;color:#77736e;font-size:9px;margin-top:5px}.view-analytics-periods{display:flex;gap:7px;margin-top:18px}.view-analytics-periods button{border:1px solid #3b393f;background:#111216;color:#aaa6a0;padding:8px 12px;font-size:9px;cursor:pointer}.view-analytics-periods button.active{border-color:#c6a864;color:#f4f1eb}.view-analytics-period-title{margin-top:20px;font-size:10px;letter-spacing:.12em;color:#c6a864}.view-analytics-list{margin-top:10px;display:grid;gap:6px}.view-analytics-row{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;border-bottom:1px solid #25242a;color:#aaa6a0;font-size:10px}.view-analytics-row strong{color:#f4f1eb}.view-analytics-bar{height:4px;margin-top:5px;background:#29272d;overflow:hidden}.view-analytics-bar i{display:block;height:100%;background:#c6a864}.view-analytics-empty{padding:18px;border:1px solid #2c2b30;color:#77736e;font-size:10px;text-align:center}.view-analytics-note{margin-top:14px;color:#77736e;font-size:9px;line-height:1.7}
@media(max-width:900px){.view-analytics-metrics{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.view-analytics{padding:21px}.view-analytics-metrics{grid-template-columns:1fr}.view-analytics-periods{flex-wrap:wrap}}
</style>
<section class="view-analytics" id="viewAnalytics"><div class="view-analytics-head"><strong>動画詳細ページ閲覧数</strong><span>PAGE VIEWS / SELLER ANALYTICS</span></div><div class="view-analytics-metrics"><article class="view-analytics-metric"><b>TODAY</b><strong id="viewToday">0</strong><span>今日</span></article><article class="view-analytics-metric"><b>THIS MONTH</b><strong id="viewMonth">0</strong><span>今月</span></article><article class="view-analytics-metric"><b>THIS YEAR</b><strong id="viewYear">0</strong><span>今年</span></article><article class="view-analytics-metric"><b>ALL TIME</b><strong id="viewTotal">0</strong><span>累計</span></article></div><div class="view-analytics-periods"><button type="button" class="active" data-period="daily" onclick="window.__sellerViewPeriod('daily')">日別</button><button type="button" data-period="monthly" onclick="window.__sellerViewPeriod('monthly')">月別</button><button type="button" data-period="yearly" onclick="window.__sellerViewPeriod('yearly')">年別</button></div><div class="view-analytics-period-title" id="viewAnalyticsTitle">日別の閲覧数</div><div class="view-analytics-list" id="viewAnalyticsList"><div class="view-analytics-empty">閲覧データを読み込んでいます。</div></div><div class="view-analytics-note">動画詳細ページが実際に表示された回数を集計します。動画そのものの再生時間・再生回数は含みません。</div></section>
<script id="seller-view-analytics-script">(()=>{let data=null;const labels={daily:'日別の閲覧数',monthly:'月別の閲覧数',yearly:'年別の閲覧数'};window.__sellerViewPeriod=period=>{if(!data)return;document.querySelectorAll('#viewAnalytics [data-period]').forEach(x=>x.classList.toggle('active',x.dataset.period===period));document.getElementById('viewAnalyticsTitle').textContent=labels[period];const rows=data[period]||[];const list=document.getElementById('viewAnalyticsList');if(!rows.length){list.innerHTML='<div class="view-analytics-empty">この期間の閲覧データはありません。</div>';return}const max=Math.max(...rows.map(x=>Number(x.count)),1);list.innerHTML=rows.slice().reverse().map(x=>{const label=period==='daily'?x.date:period==='monthly'?x.month:x.year;const count=Number(x.count);return '<div class="view-analytics-row"><div><span>'+label+'</span><div class="view-analytics-bar"><i style="width:'+Math.max(4,Math.round(count/max*100))+'%"></i></div></div><strong>'+count.toLocaleString()+' 回</strong></div>'}).join('')};const load=async()=>{try{const r=await fetch('/api/demo/view-analytics',{cache:'no-store'});if(!r.ok)return;data=await r.json();document.getElementById('viewToday').textContent=data.today.toLocaleString();document.getElementById('viewMonth').textContent=data.month.toLocaleString();document.getElementById('viewYear').textContent=data.year.toLocaleString();document.getElementById('viewTotal').textContent=data.total.toLocaleString();window.__sellerViewPeriod('daily')}catch{}};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load()})()</script>`;

function patchCreator(html) {
  if (html.includes('id="viewAnalytics"')) return html;
  return html.replace('<section class="grid">', `${ANALYTICS_UI}<section class="grid">`);
}

const server = createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
  if (req.method === 'GET' && pathname === '/api/demo/view-analytics') {
    const body = JSON.stringify(analytics());
    res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
    return;
  }

  const upstream = httpRequest({ hostname: '127.0.0.1', port: upstreamPort, path: req.url, method: req.method, headers: req.headers }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && pathname === '/pages/product-detail.html' && response.statusCode === 200 && type.includes('text/html')) {
        const html = body.toString('utf8');
        if (html.includes('Demo Creator')) views.push(new Date().toISOString());
      }
      if (req.method === 'GET' && pathname === '/pages/creator-studio.html' && response.statusCode === 200 && type.includes('text/html')) {
        body = Buffer.from(patchCreator(body.toString('utf8')), 'utf8');
      }
      const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate', pragma: 'no-cache', expires: '0' };
      delete headers['transfer-encoding'];
      res.writeHead(response.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', error => { res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' }); res.end(`Upstream unavailable: ${error.message}`); });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE seller analytics proxy listening on ${port}`));
const shutdown = () => process.exit(0);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
