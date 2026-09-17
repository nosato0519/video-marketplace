import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['messaging-ui-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

const SELLER_MENU_STYLE = `<style id="seller-menu-ui">
.seller-menu{max-width:1280px;margin:0 auto;padding:22px 28px 0}.seller-menu-inner{border:1px solid #35333a;background:linear-gradient(145deg,#15161a,#0d0e11);padding:12px 14px;display:flex;align-items:center;gap:4px;flex-wrap:nowrap;overflow-x:auto}.seller-menu-label{color:#77736e;font-size:10px;letter-spacing:.16em;font-weight:800;margin:0 10px 0 3px;white-space:nowrap;flex:0 0 auto}.seller-menu-link{position:relative;display:inline-flex;align-items:center;gap:5px;padding:10px 10px;border:1px solid transparent;color:#cfc9bf;font-size:10px;text-decoration:none;white-space:nowrap;flex:0 0 auto}.seller-menu-link:hover{border-color:#4a463d;background:#12110e;color:#d9b45f}.seller-menu-link strong{font-weight:600}.seller-menu-badge{display:inline-flex;align-items:center;padding:3px 5px;border:1px solid #5b4b2d;color:#d9b45f;font-size:7px;line-height:1}.seller-menu-link.active{border-color:#5b4b2d;color:#d9b45f;background:#15130f}@media(max-width:760px){.seller-menu{padding:16px 18px 0}.seller-menu-inner{justify-content:flex-start}.seller-menu-label{position:sticky;left:0;background:#15161a;padding-right:7px}.seller-menu-link{flex:0 0 auto}}
</style>`;

const SELLER_MENU = `${SELLER_MENU_STYLE}<nav class="seller-menu" aria-label="販売者メニュー"><div class="seller-menu-inner"><span class="seller-menu-label">SELLER MENU</span><a class="seller-menu-link active" href="/pages/creator-studio.html">ダッシュボード</a><a class="seller-menu-link" href="/pages/creator-studio.html#products">動画管理</a><a class="seller-menu-link" href="/pages/sales-history.html">売上履歴</a><a class="seller-menu-link" href="/pages/view-analytics.html">視聴分析</a><a class="seller-menu-link" href="/pages/payout-settings.html">振込・受取設定</a><a class="seller-menu-link" href="/pages/seller-account.html">会員情報</a><a class="seller-menu-link" href="/pages/messages.html?role=seller">メッセージ <span class="seller-menu-badge">未返信 1</span></a><a class="seller-menu-link" href="/pages/support.html">運営サポート <span class="seller-menu-badge">対応中 1</span></a></div></nav>`;

function injectSellerMenu(html, pathname){
  if(pathname !== '/pages/creator-studio.html' || !/<body[\s\S]*<\/body>/i.test(html)) return html;
  if(html.includes('seller-menu-ui')) return html;
  const heroEnd = /(<\/section>\s*<section class="metrics">)/i;
  if(heroEnd.test(html)) return html.replace(heroEnd, `${SELLER_MENU}$1`);
  return html.replace(/<body([^>]*)>/i, `<body$1>${SELLER_MENU}`);
}

const server=createServer((req,res)=>{
  const pathname=(req.url||'/').split('?')[0];
  const upstream=httpRequest({hostname:'127.0.0.1',port:upstreamPort,path:req.url,method:req.method,headers:req.headers},response=>{
    const chunks=[];response.on('data',c=>chunks.push(c));response.on('end',()=>{
      let body=Buffer.concat(chunks);
      const type=String(response.headers['content-type']||'');
      if(req.method==='GET'&&type.includes('text/html')) body=Buffer.from(injectSellerMenu(body.toString('utf8'),pathname),'utf8');
      const headers={...response.headers,'content-length':String(body.length),'cache-control':'no-store, no-cache, must-revalidate, proxy-revalidate',pragma:'no-cache',expires:'0'};
      delete headers['transfer-encoding'];res.writeHead(response.statusCode||200,headers);res.end(body);
    });
  });
  upstream.on('error',error=>{res.writeHead(502,{'content-type':'text/plain; charset=utf-8'});res.end(`Upstream unavailable: ${error.message}`)});
  req.pipe(upstream);
});

server.listen(port,'0.0.0.0',()=>console.log(`VIDEO MARKETPLACE seller menu proxy listening on ${port}`));
process.on('SIGTERM',()=>process.exit(0));
process.on('SIGINT',()=>process.exit(0));