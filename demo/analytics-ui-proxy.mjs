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

const server = createServer((req, res) => {
  const pathname = (req.url || '/').split('?')[0];
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
        body = Buffer.from(body.toString('utf8') + UI_FIX, 'utf8');
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
