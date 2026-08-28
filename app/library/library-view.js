import { authApi } from '../auth/auth-api.js';
import { libraryApi } from './library-api.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export async function renderLibrary(root) {
  root.innerHTML = '<section class="library-page"><p class="eyebrow">MY LIBRARY</p><h1>Your purchases</h1><p class="microcopy">Loading your secure library…</p></section>';
  try {
    const me = await authApi.me();
    const result = await libraryApi.list();
    const items = result.items || [];
    root.innerHTML = `<section class="library-page"><div class="page-heading"><div><p class="eyebrow">MY LIBRARY</p><h1>${escapeHtml(me.user.email)}’s library</h1></div><a class="button secondary" href="#/browse">Continue browsing</a></div>${items.length ? `<div class="library-grid">${items.map((item) => `<article class="library-card"><div class="product-thumb large">VIDEO</div><div class="library-copy"><p class="eyebrow">Purchased</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || 'Purchased video product.')}</p><div class="library-actions">${item.streaming_enabled ? `<a class="button" href="#/watch/${encodeURIComponent(item.product_id)}">Watch</a>` : ''}${item.download_enabled ? `<a class="button secondary" href="#/download/${encodeURIComponent(item.product_id)}">Download</a>` : ''}</div></div></article>`).join('')}</div>` : '<div class="empty-state"><h2>Your library is empty</h2><p>Purchase a published video to access it here.</p><a class="button" href="#/browse">Browse videos</a></div>'}</section>`;
  } catch (error) {
    if (error.status === 401) { location.hash = '#/login?return=/library'; return; }
    root.innerHTML = '<section class="library-page"><div class="empty-state"><h2>Library unavailable</h2><p>Please try again shortly.</p></div></section>';
  }
}
