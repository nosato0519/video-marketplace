const categoryDefinitions = {
  movie: { name: '映画・映像', description: '映画・映像作品から、観たい一本を見つけられます。' },
  learning: { name: '学び', description: '講座・チュートリアル・スキルを学べる動画を集めています。' },
  documentary: { name: 'ドキュメンタリー', description: '人・街・社会・自然を描いたドキュメンタリー作品。' },
  creative: { name: 'クリエイティブ', description: '映像制作・デザイン・表現に関する作品を集めています。' }
};
const categoryAliases = { film: 'movie', education: 'learning' };

function escapeListingHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[character]));
}

function listingPrice(product) {
  const amount = Number(product.price_amount ?? 0);
  if (product.price_currency === 'JPY') return '¥' + amount.toLocaleString('ja-JP');
  return escapeListingHtml(product.price_currency || '') + ' ' + amount.toLocaleString();
}

async function fetchPublishedListings({ category = '', limit = 6 } = {}) {
  const params = new URLSearchParams({ locale: 'ja', limit: String(limit) });
  if (category) params.set('category', category);
  const response = await fetch('/api/catalog/products?' + params, { credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('catalog_load_failed');
  const payload = await response.json();
  return Array.isArray(payload.data) ? payload.data : [];
}

function listingCard(product, index, categoryName = '') {
  const category = categoryName || categoryDefinitions[product.category]?.name || product.category || '動画';
  return `<a href="/pages/product-detail.html?productId=${encodeURIComponent(product.id)}" class="video-card">
    <div class="thumb t${(index % 9) + 1}"><span>VIDEO</span></div>
    <div class="card-info">
      <i>${escapeListingHtml(category)}</i>
      <h3>${escapeListingHtml(product.title)}</h3>
      <p>${escapeListingHtml(product.description || '')}</p>
      <div><span>by ${escapeListingHtml(product.seller || '')}</span><b>${listingPrice(product)}</b></div>
    </div>
  </a>`;
}

async function renderNewReleases(grid) {
  try {
    const products = await fetchPublishedListings({ limit: 6 });
    grid.innerHTML = products.length
      ? products.map((product, index) => listingCard(product, index)).join('')
      : '<p class="announcement-empty">公開中の動画はまだありません。</p>';
  } catch {
    grid.innerHTML = '<p class="announcement-empty">動画を読み込めませんでした。時間をおいて再度お試しください。</p>';
  }
}

async function renderCategoryListings(grid) {
  const requested = new URLSearchParams(location.search).get('category') || 'movie';
  const slug = categoryAliases[requested] || requested;
  const category = categoryDefinitions[slug];
  if (!category) {
    document.getElementById('category-title').textContent = 'カテゴリーが見つかりません';
    document.getElementById('category-heading').textContent = '動画';
    document.getElementById('category-description').textContent = '利用できるカテゴリーから選び直してください。';
    grid.innerHTML = '<p class="announcement-empty">このカテゴリーは現在利用できません。</p>';
    return;
  }
  document.title = category.name + ' | VIDEO MARKETPLACE';
  document.getElementById('category-title').textContent = category.name + 'から探す。';
  document.getElementById('category-heading').textContent = category.name + 'の動画';
  document.getElementById('category-description').textContent = category.description;
  document.querySelectorAll('[data-category]').forEach((link) => {
    const linkSlug = categoryAliases[link.dataset.category] || link.dataset.category;
    link.classList.toggle('is-active', linkSlug === slug);
  });
  try {
    const products = await fetchPublishedListings({ category: slug, limit: 24 });
    grid.innerHTML = products.length
      ? products.map((product, index) => listingCard(product, index, category.name)).join('')
      : '<p class="announcement-empty">このカテゴリーには公開中の動画がまだありません。</p>';
  } catch {
    grid.innerHTML = '<p class="announcement-empty">動画を読み込めませんでした。時間をおいて再度お試しください。</p>';
  }
}

document.querySelectorAll('[data-published-listings="new-releases"]').forEach(renderNewReleases);
document.querySelectorAll('[data-published-listings="category"]').forEach(renderCategoryListings);
