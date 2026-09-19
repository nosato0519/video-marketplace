import { createServer, request as httpRequest } from 'node:http';
import { spawn } from 'node:child_process';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port + 1;

spawn(process.execPath, ['safe-proxy.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit',
});

const STABLE_HOME_NAV = `<script id="stable-home-navigation">(()=>{const ids={'Creator Masterclass':1,'Cinematic Travel Pack':2,'Build Your Digital Product':3,'Motion Design Toolkit':4,'Designing Ideas':5,'Mountain Silence':6,'THE LAST SIGNAL':7,'Tokyo After Hours':8,'Build Your Brand':9,'BLUE HORIZON':10,'Mastering Motion':11,'KYOTO IN MOTION':12,'NIGHT SESSION':13,'THE CRAFTSMEN':14},cats={EDUCATION:'教育',LEARNING:'教育',FILM:'映像作品',DOCUMENTARY:'映像作品',TRAVEL:'映像作品',CULTURE:'映像作品',BUSINESS:'ビジネス',CREATIVE:'クリエイティブ',LIFESTYLE:'ライフスタイル',MUSIC:'音楽',ADULT:'アダルト'},titleCat={'THE LAST SIGNAL':'映像作品','Tokyo After Hours':'映像作品','Build Your Brand':'ビジネス','BLUE HORIZON':'映像作品','Mastering Motion':'クリエイティブ','KYOTO IN MOTION':'映像作品','NIGHT SESSION':'音楽','THE CRAFTSMEN':'映像作品'},norm=v=>(v||'').replace(/\\s+/g,' ').trim(),apply=()=>{if(location.pathname!=='/'&&location.pathname!=='/index.html')return;for(const el of document.querySelectorAll('a.system')){const t=norm(el.textContent);if(t==='販売者デモ'){el.href='/pages/creator-studio.html';el.removeAttribute('onclick')}if(t==='購入者デモ'){el.href='/pages/account.html';el.removeAttribute('onclick')}if(t==='管理者デモ'){el.href='/pages/admin.html';el.removeAttribute('onclick')}}for(const el of document.querySelectorAll('.login-dropdown button')){const t=norm(el.textContent);if(t==='販売者ログイン')el.onclick=()=>location.href='/pages/login.html?role=seller';if(t==='購入者ログイン')el.onclick=()=>location.href='/pages/login.html?role=buyer'}const contentHandler=e=>{const t=e.target instanceof Element?e.target.closest('a,button,[role="button"],.video-card,.showcase-card,.mosaic-card,.genre-card,.recommendation-card,.cat'):null;if(!t)return;const text=norm(t.textContent);if(text==='販売者デモ'||text==='購入者デモ'||text==='販売者ログイン'||text==='購入者ログイン')return;const card=t.closest('.video-card,.showcase-card,.mosaic-card,[data-video-id]');if(card){const direct=card.closest('[data-video-id]');const id=Number(direct?.dataset.videoId||0)||ids[norm(card.querySelector('h3,h2,[data-video-title],.showcase-label,.title')?.textContent)]||0;if(id){e.preventDefault();e.stopImmediatePropagation();location.href='/pages/product-detail.html?product='+encodeURIComponent(id);return}}const genre=t.closest('.genre-rail .genre-card,.genre-recommendations .recommendation-card,.cat');if(genre){const raw=norm(genre.getAttribute('data-category')||genre.querySelector('strong,.recommendation-meta span,.category')?.textContent||genre.textContent);const title=norm(genre.querySelector('h3,h2,.title')?.textContent);const c=cats[raw]||cats[raw.toUpperCase()]||({'映画のような映像':'映像作品','学びたい夜':'教育','旅に出る':'映像作品','音楽に浸る':'音楽','大人の映像':'アダルト','シネマティック':'映像作品','クリエイター':'クリエイティブ','ビジネス':'ビジネス','イベント':'音楽','インタビュー':'クリエイティブ','ラーニング':'教育'}[raw])||cats[title]||'映像作品';e.preventDefault();e.stopImmediatePropagation();location.href='/pages/video-list.html?category='+encodeURIComponent(c);return}};if(window.__stableHomeContentHandler)document.removeEventListener('click',window.__stableHomeContentHandler,true);window.__stableHomeContentHandler=contentHandler;document.addEventListener('click',contentHandler,true)};const ready=()=>apply();if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();window.addEventListener('pageshow',apply);window.addEventListener('load',apply)})()</script>`;

function patchHomepage(html) {
  return html
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>\s*販売者デモ<\/a>/, '<a class="system" href="/pages/creator-studio.html">販売者デモ</a>')
    .replace(/<a class="system" href="#" onclick="event\.preventDefault\(\)"\s*>\s*購入者デモ<\/a>/, '<a class="system" href="/pages/account.html">購入者デモ</a>')
    .replace(/(<a class="system" href="\/pages\/account\.html">購入者デモ<\/a>)/, '$1<a class="system" href="/pages/admin.html">管理者デモ</a>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*販売者ログイン<\/button>/, '<button type="button" onclick="location.href=\'/pages/login.html?role=seller\'">販売者ログイン</button>')
    .replace(/<button type="button" onclick="event\.preventDefault\(\)">\s*購入者ログイン\s*<\/button>/, '<button type="button" onclick="location.href=\'/pages/login.html?role=buyer\'">購入者ログイン</button>')
    .replace('</body>', `${STABLE_HOME_NAV}</body>`);
}

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
      if (req.method === 'GET' && (pathname === '/' || pathname === '/index.html') && type.includes('text/html')) {
        body = Buffer.from(patchHomepage(body.toString('utf8')), 'utf8');
      }
      const headers = {
        ...response.headers,
        'content-length': String(body.length),
        'cache-control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        pragma: 'no-cache',
        expires: '0',
      };
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

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE homepage navigation proxy listening on ${port}`));
const shutdown = () => process.exit(0);
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
