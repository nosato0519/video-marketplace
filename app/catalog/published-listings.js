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

function listingCard(product, categoryName = '') {
  const category = categoryName || categoryDefinitions[product.category]?.name || product.category || '動画';
  const thumbnail = product.thumbnail_url
    ? `<img class="published-listing-thumbnail" style="display:block;width:100%;height:100%;object-fit:cover" src="${escapeListingHtml(product.thumbnail_url)}" alt="${escapeListingHtml(product.title)}" loading="lazy">`
    : '<span>VIDEO</span>';
  return `<a href="/pages/product-detail.html?productId=${encodeURIComponent(product.id)}" class="video-card">
    <div class="thumb published-listing-thumb" style="background-color:#111;display:grid;place-items:center">${thumbnail}</div>
    <div class="card-info">
      <i>${escapeListingHtml(category)}</i>
      <h3>${escapeListingHtml(product.title)}</h3>
      <p>${escapeListingHtml(product.description || '')}</p>
      <div><span>by ${escapeListingHtml(product.seller || '')}</span><b>${listingPrice(product)}</b></div>
    </div>
  </a>`;
}

function watchListingThumbnailErrors(container) {
  container.querySelectorAll('.published-listing-thumbnail').forEach((image) => {
    image.addEventListener('error', () => {
      const fallback = document.createElement('span');
      fallback.textContent = 'VIDEO';
      image.replaceWith(fallback);
    }, { once: true });
  });
}

async function renderNewReleases(grid) {
  try {
    const products = await fetchPublishedListings({ limit: 6 });
    grid.innerHTML = products.length
      ? products.map((product) => listingCard(product)).join('')
      : '<p class="announcement-empty">公開中の動画はまだありません。</p>';
    watchListingThumbnailErrors(grid);
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
      ? products.map((product) => listingCard(product, category.name)).join('')
      : '<p class="announcement-empty">このカテゴリーには公開中の動画がまだありません。</p>';
    watchListingThumbnailErrors(grid);
  } catch {
    grid.innerHTML = '<p class="announcement-empty">動画を読み込めませんでした。時間をおいて再度お試しください。</p>';
  }
}

document.querySelectorAll('[data-published-listings="new-releases"]').forEach(renderNewReleases);
document.querySelectorAll('[data-published-listings="category"]').forEach(renderCategoryListings);

async function renderProductDetail() {
  const productId = new URLSearchParams(location.search).get('productId');
  if (!productId || !document.querySelector('.detail-page')) return;

  try {
    const response = await fetch('/api/catalog/products/' + encodeURIComponent(productId) + '?locale=ja', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });
    if (!response.ok) throw new Error('product_load_failed');
    const payload = await response.json();
    const product = payload.data;
    if (!product) throw new Error('product_not_found');

    const category = categoryDefinitions[product.category]?.name || product.category || '動画';
    const mediaBadge = document.querySelector('.detail-badge');
    if (mediaBadge) mediaBadge.hidden = true;
    const mediaDuration = document.querySelector('.detail-duration');
    if (mediaDuration) mediaDuration.hidden = true;
    const rating = document.querySelector('.detail-rating span:first-child');
    if (rating) rating.hidden = true;
    const detailsSection = [...document.querySelectorAll('.detail-section')].find((section) => section.querySelector('.detail-section-label')?.textContent.trim() === 'DETAILS');
    if (detailsSection) detailsSection.hidden = true;
    document.title = product.title + ' | VIDEO MARKETPLACE';
    const breadcrumb = document.querySelector('.detail-breadcrumb');
    if (breadcrumb) breadcrumb.textContent = 'HOME / VIDEO / ' + category + ' / ' + product.title;
    const kicker = document.querySelector('.detail-kicker');
    if (kicker) kicker.textContent = category + ' · VIDEO';
    const title = document.querySelector('.detail-info h1');
    if (title) title.textContent = product.title;
    const lead = document.querySelector('.detail-lead');
    if (lead) lead.textContent = product.description || '';
    const about = [...document.querySelectorAll('.detail-section')].find((section) => section.querySelector('.detail-section-label')?.textContent.trim() === 'ABOUT THIS VIDEO');
    const aboutDescription = about?.querySelector('p');
    if (aboutDescription) aboutDescription.textContent = product.description || '作品説明はまだ登録されていません。';
    const seller = document.querySelector('.detail-rating span:nth-child(2)');
    if (seller) seller.textContent = 'by ' + (product.seller || '');
    const creator = document.querySelector('.detail-creator');
    if (creator) {
      const creatorName = creator.querySelector('strong');
      const creatorRole = creator.querySelector('span');
      const creatorAvatar = creator.querySelector('.detail-avatar');
      if (creatorName) creatorName.textContent = product.seller || '販売者';
      if (creatorRole) creatorRole.textContent = '販売者';
      if (creatorAvatar) creatorAvatar.textContent = Array.from(product.seller || '販')[0];
      creator.href = '/pages/video-list.html';
    }
    const price = document.querySelector('.detail-price');
    if (price) price.textContent = product.price_currency === 'JPY'
      ? '¥' + Number(product.price_amount).toLocaleString('ja-JP')
      : Number(product.price_amount).toLocaleString('ja-JP') + ' ' + (product.price_currency || '');

    const images = Array.isArray(product.images) ? product.images : [];
    const thumbnail = images.find((image) => image.role === 'thumbnail') || images.find((image) => image.role === 'gallery');
    const heroImage = document.querySelector('.detail-media-image');
    if (heroImage) {
      heroImage.dataset.galleryImageUrl = thumbnail?.url || '';
      heroImage.style.backgroundImage = thumbnail ? 'url("' + thumbnail.url + '")' : 'none';
      heroImage.style.backgroundSize = 'cover';
      heroImage.style.backgroundPosition = 'center';
    }
    const galleryImages = images.filter((image) => image.role === 'gallery');
    const galleryNodes = [...document.querySelectorAll('.detail-gallery-image')];
    galleryNodes.forEach((node, index) => {
      const image = galleryImages[index];
      node.hidden = !image;
      node.style.display = image ? 'block' : 'none';
      node.style.width = '100%';
      node.style.minHeight = image ? '70px' : '0';
      node.style.aspectRatio = '16 / 9';
      node.dataset.galleryImageUrl = image?.url || '';
      node.style.backgroundImage = image ? 'url("' + image.url + '")' : 'none';
      node.style.backgroundSize = 'cover';
      node.style.backgroundPosition = 'center';
    });
    const gallery = document.querySelector('.detail-gallery');
    if (gallery) {
      gallery.hidden = galleryImages.length === 0;
      gallery.style.display = galleryImages.length ? 'grid' : 'none';
    }
  } catch {
    const main = document.querySelector('.detail-page');
    if (main) {
      main.innerHTML = '<section class="detail-section"><h1>作品を表示できませんでした</h1><p>作品が公開されていないか、情報を読み込めませんでした。動画一覧から選び直してください。</p><a href="/pages/video-list.html">動画一覧へ戻る</a></section>';
    }
  }
}

renderProductDetail();

