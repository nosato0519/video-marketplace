import { listProducts } from '../catalog/catalog.js';

export function renderCreators(root) {
  const creators = [...new Map(listProducts().map((product) => [product.seller, product])).values()];
  root.innerHTML = `<section class="page-section"><p class="eyebrow">Creators</p><h1>Discover creators</h1><p class="microcopy">Explore the people and studios behind the marketplace's video products.</p><div class="card-grid">${creators.map((product) => `<article class="card"><div class="product-thumb">VIDEO</div><h2>${product.seller}</h2><p>Creator with ${listProducts().filter((item) => item.seller === product.seller).length} published product(s).</p><a class="button secondary" href="#/browse?q=${encodeURIComponent(product.seller)}">View products</a></article>`).join('')}</div><div class="section-actions"><a class="button" href="#/seller/register">Become a creator</a></div></section>`;
}
