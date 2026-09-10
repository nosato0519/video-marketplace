const DEFAULT_BRAND = 'VIDEO MARKETPLACE';
const LEGACY_BRAND = 'VIDORA';
const BRAND_META = document.querySelector('meta[name="video-marketplace-brand"]');
const BRAND = (BRAND_META?.content || DEFAULT_BRAND).trim() || DEFAULT_BRAND;

function applyBrand(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    if (!node.nodeValue) continue;
    node.nodeValue = node.nodeValue
      .replaceAll(LEGACY_BRAND, BRAND)
      .replaceAll(DEFAULT_BRAND, BRAND);
  }

  if (document.title) {
    document.title = document.title
      .replaceAll(LEGACY_BRAND, BRAND)
      .replaceAll(DEFAULT_BRAND, BRAND);
  }
}

applyBrand();
new MutationObserver(() => applyBrand()).observe(document.documentElement, { childList: true, subtree: true });
