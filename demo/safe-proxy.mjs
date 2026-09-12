import { spawn } from 'node:child_process';
import { createServer, request as httpRequest } from 'node:http';

const port = Number(process.env.PORT || 10000);
const upstreamPort = port === 10000 ? 10001 : port + 1;

const child = spawn(process.execPath, ['force-page.mjs'], {
  cwd: new URL('.', import.meta.url),
  env: { ...process.env, PORT: String(upstreamPort) },
  stdio: 'inherit'
});

const IDS = {
  'Creator Masterclass': 1,
  'Cinematic Travel Pack': 2,
  'Build Your Digital Product': 3,
  'Motion Design Toolkit': 4,
  'Designing Ideas': 5,
  'Mountain Silence': 6,
  'THE LAST SIGNAL': 7,
  'Tokyo After Hours': 8,
  'Build Your Brand': 9,
  'BLUE HORIZON': 10,
  'Mastering Motion': 11,
  'KYOTO IN MOTION': 12,
  'NIGHT SESSION': 13,
  'THE CRAFTSMEN': 14
};

const DETAIL_DATA = {
  7: {title:'THE LAST SIGNAL',category:'DOCUMENTARY',quality:'4K',duration:'1:34:02',durationLong:'94 min 02 sec',seller:'Aki Studio',rating:'4.9',price:'¥1,980',avatar:'A',lead:'遠い宇宙から届いた、最後のメッセージ。その謎を追うドキュメンタリー作品です。',image:'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=88'},
  8: {title:'Tokyo After Hours',category:'TRAVEL',quality:'4K',duration:'1:05:18',durationLong:'65 min 18 sec',seller:'KEN FILMS',rating:'4.8',price:'¥980',avatar:'K',lead:'夜の東京を歩きながら、その街の光と空気を切り取ったシネマティック映像作品です。',image:'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=1000&q=88'},
  9: {title:'Build Your Brand',category:'BUSINESS',quality:'HD',duration:'59:31',durationLong:'59 min 31 sec',seller:'MIKA',rating:'4.7',price:'¥1,480',avatar:'M',lead:'ブランドを育てるための考え方と実践を、映像で分かりやすくまとめた作品です。',image:'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1200&q=88'},
  10:{title:'BLUE HORIZON',category:'FILM',quality:'4K',duration:'36:10',durationLong:'36 min 10 sec',seller:'North Coast',rating:'4.9',price:'¥780',avatar:'N',lead:'海と光を巡るシネマティックな映像。美しい風景をじっくり楽しめる作品です。',image:'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=1200&q=88'},
  11:{title:'Mastering Motion',category:'CREATIVE',quality:'HD',duration:'59:31',durationLong:'59 min 31 sec',seller:'FRAME LAB',rating:'4.9',price:'¥2,400',avatar:'F',lead:'動きをデザインするための考え方と制作フローを実践的に学べる映像講座です。',image:'https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1000&q=88'},
  12:{title:'KYOTO IN MOTION',category:'TRAVEL',quality:'4K',duration:'1:05:18',durationLong:'65 min 18 sec',seller:'KOTO FILMS',rating:'4.9',price:'¥1,380',avatar:'K',lead:'古都・京都の一日を映画のように記録した、落ち着いた映像作品です。',image:'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=88'},
  13:{title:'NIGHT SESSION',category:'MUSIC',quality:'HD',duration:'27:44',durationLong:'27 min 44 sec',seller:'ROOM 09',rating:'4.6',price:'¥680',avatar:'R',lead:'一夜限りのライブセッションを収録した音楽映像作品です。',image:'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=88'},
  14:{title:'THE CRAFTSMEN',category:'DOCUMENTARY',quality:'4K',duration:'1:34:02',durationLong:'94 min 02 sec',seller:'FIELD NOTE',rating:'4.8',price:'¥1,680',avatar:'F',lead:'ものづくりの現場に密着し、職人の技と想いを丁寧に記録した長編作品です。',image:'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1200&q=88'}
};

const CATEGORY_MAP = {
  'EDUCATION':'教育', 'LEARNING':'教育', 'FILM':'映像作品', 'DOCUMENTARY':'映像作品', 'TRAVEL':'映像作品', 'CULTURE':'映像作品',
  'BUSINESS':'ビジネス', 'CREATIVE':'クリエイティブ', 'LIFESTYLE':'ライフスタイル', 'MUSIC':'音楽', 'ADULT':'アダルト',
  '教育':'教育', '学び':'教育', '映像作品':'映像作品', '映画':'映像作品', 'ドキュメンタリー':'映像作品', '旅行':'映像作品',
  'ビジネス':'ビジネス', 'クリエイティブ':'クリエイティブ', 'ライフスタイル':'ライフスタイル', '音楽':'音楽', 'アダルト':'アダルト'
};

const TITLE_CATEGORY = Object.fromEntries(Object.entries(IDS).map(([title, id]) => [title, CATEGORY_MAP[DETAIL_DATA[id]?.category || ''] || '映像作品']));

const DISCOVERY_LABEL_MAP = {
  '映画のような映像':'映像作品',
  '学びたい夜':'教育',
  '旅に出る':'映像作品',
  '音楽に浸る':'音楽',
  '大人の映像':'アダルト',
  'シネマティック':'映像作品',
  'クリエイター':'クリエイティブ',
  'ビジネス':'ビジネス',
  'イベント':'音楽',
  'インタビュー':'クリエイティブ',
  'ラーニング':'教育'
};

const NAV_SCRIPT = `<script id="safe-video-navigation">
(() => {
  const ids = ${JSON.stringify(IDS)};
  const categoryMap = ${JSON.stringify(CATEGORY_MAP)};
  const titleCategory = ${JSON.stringify(TITLE_CATEGORY)};
  const discoveryLabelMap = ${JSON.stringify(DISCOVERY_LABEL_MAP)};
  const categoryPath = category => '/pages/video-list.html?category=' + encodeURIComponent(category);
  const normalize = value => (value || '').replace(/\\s+/g, ' ').trim();
  const findCategory = card => {
    if (!card) return null;
    const explicit = card.dataset.category || card.getAttribute('data-category');
    if (explicit && categoryMap[explicit]) return categoryMap[explicit];
    const title = normalize(card.querySelector('h3,h2,[data-video-title],.showcase-label,.title')?.textContent);
    if (titleCategory[title]) return titleCategory[title];
    const label = normalize(card.querySelector('strong,.recommendation-meta span,.category')?.textContent);
    if (discoveryLabelMap[label]) return discoveryLabelMap[label];
    const text = normalize(card.textContent).toUpperCase();
    for (const [key, value] of Object.entries(categoryMap)) {
      if (text.includes(String(key).toUpperCase())) return value;
    }
    for (const [key, value] of Object.entries(discoveryLabelMap)) {
      if (text.includes(String(key).toUpperCase())) return value;
    }
    return null;
  };
  const discoveryCard = target => target?.closest('.genre-rail .genre-card, .genre-recommendations .recommendation-card, .cat');
  const markDiscoveryCards = () => {
    document.querySelectorAll('.genre-rail .genre-card, .genre-recommendations .recommendation-card, .cat').forEach(card => {
      if (!findCategory(card)) return;
      card.style.cursor = 'pointer';
      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', 'カテゴリー一覧を見る');
    });
  };
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const card = discoveryCard(target);
    if (!card) return;
    const category = findCategory(card);
    if (!category) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign(categoryPath(category));
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = discoveryCard(event.target instanceof Element ? event.target : null);
    if (!card) return;
    const category = findCategory(card);
    if (!category) return;
    event.preventDefault();
    window.location.assign(categoryPath(category));
  }, true);
  markDiscoveryCards();
})();
</script>`;

const CATEGORY_QUERY_SCRIPT = `<script id="safe-category-filter">
(() => {
  if (location.pathname !== '/pages/video-list.html') return;
  const category = new URLSearchParams(location.search).get('category');
  if (!category) return;
  const filters = [...document.querySelectorAll('.filters .filter')];
  const target = filters.find(el => (el.textContent || '').trim() === category);
  if (!target) return;
  target.click();
  document.querySelector('.hero')?.scrollIntoView({block:'start'});
})();
</script>`;

const DETAIL_SCRIPT = `<script id="safe-detail-data">
(() => {
  const data = ${JSON.stringify(DETAIL_DATA)};
  const id = Number(new URLSearchParams(location.search).get('product') || 1);
  const item = data[id];
  if (!item) return;
  const visual = document.querySelector('.visual');
  if (visual) {
    visual.style.backgroundImage = "linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.72)),url('" + item.image + "')";
    visual.style.backgroundPosition = 'center';
    visual.style.backgroundSize = 'cover';
  }
  document.title = item.title + ' | VIDEO MARKETPLACE';
  const set = (selector, value) => { const el = document.querySelector(selector); if (el) el.textContent = value; };
  set('.crumb', 'HOME / VIDEO / ' + item.category + ' / ' + item.title);
  set('.kicker', item.category + ' · ' + item.quality);
  const h1 = document.querySelector('.details h1'); if (h1) h1.innerHTML = item.title.replace(/\\s+/g,'<br>');
  set('.lead', item.lead);
  set('.stars', '★★★★★ ' + item.rating);
  set('.seller', 'by ' + item.seller);
  set('.price', item.price);
  set('.visual .duration', item.duration);
  set('.facts .fact:nth-child(1) strong', item.quality === '4K' ? '4K UHD' : item.quality);
  set('.facts .fact:nth-child(2) strong', item.durationLong);
  set('.creator .avatar', item.avatar);
  set('.creator strong', item.seller);
  set('.creator span', 'Creator / ' + item.category + ' · ' + item.rating + ' ★');
})();
</script>`;

const server = createServer((req, res) => {
  const upstream = httpRequest({
    hostname: '127.0.0.1',
    port: upstreamPort,
    path: req.url,
    method: req.method,
    headers: req.headers
  }, response => {
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      let body = Buffer.concat(chunks);
      const type = String(response.headers['content-type'] || '');
      if (req.method === 'GET' && type.includes('text/html') && !req.url.startsWith('/api/')) {
        let html = body.toString('utf8');
        if (req.url.split('?')[0] === '/pages/product-detail.html') {
          html = html.includes('</body>') ? html.replace('</body>', `${DETAIL_SCRIPT}</body>`) : html;
        }
        html = html.includes('</body>') ? html.replace('</body>', `${NAV_SCRIPT}</body>`) : html;
        if (req.url.split('?')[0] === '/pages/video-list.html') {
          html = html.includes('</body>') ? html.replace('</body>', `${CATEGORY_QUERY_SCRIPT}</body>`) : `${html}${CATEGORY_QUERY_SCRIPT}`;
        }
        body = Buffer.from(html, 'utf8');
      }
      const headers = { ...response.headers, 'content-length': String(body.length), 'cache-control': 'no-store' };
      delete headers['transfer-encoding'];
      res.writeHead(response.statusCode || 200, headers);
      res.end(body);
    });
  });
  upstream.on('error', error => {
    res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(`Upstream unavailable: ${error.message}`);
  });
  req.pipe(upstream);
});

server.listen(port, '0.0.0.0', () => console.log(`VIDEO MARKETPLACE safe proxy listening on ${port}`));
const shutdown = () => { child.kill('SIGTERM'); process.exit(0); };
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
