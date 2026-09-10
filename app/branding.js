const BRAND_META = document.querySelector('meta[name="video-marketplace-brand"]');
const BRAND = (BRAND_META?.content || 'VIDEO MARKETPLACE').trim() || 'VIDEO MARKETPLACE';

function applyBrand(root = document) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.nodeValue?.includes('VIDORA')) node.nodeValue = node.nodeValue.replaceAll('VIDORA', BRAND);
  }
  document.title = document.title.replaceAll('VIDORA', BRAND);
}

applyBrand();
new MutationObserver(() => applyBrand()).observe(document.documentElement, { childList: true, subtree: true });
