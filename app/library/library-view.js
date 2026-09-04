import { authApi } from '../auth/auth-api.js';
import { libraryApi } from './library-api.js';
import { mediaStreamUrl, mediaDownloadUrl } from './media-api.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', "'": '&#39;' })[char]);
}

function mediaState(item) {
  if (item.media_status && item.media_status !== 'ready') return 'processing';
  if (!item.media_asset_id) return 'unavailable';
  return 'ready';
}

export async function renderLibrary(root) {
  root.innerHTML = '<section class="library-page"><p class="eyebrow">MY LIBRARY</p><h1>My Library</h1><p class="microcopy">Loading your secure library…</p></section>';
  try {
    const me = await authApi.me();
    const result = await libraryApi.list();
    const items = result.items || [];
    root.innerHTML = `<section class="library-page">
      <div class="page-heading">
        <div><p class="eyebrow">MY LIBRARY</p><h1>${escapeHtml(me.user.email)} — My Library</h1><p class="microcopy">Your purchased videos · ${items.length} ${items.length === 1 ? 'title' : 'titles'}</p></div>
        <a class="button secondary" href="#/browse">Continue browsing</a>
      </div>
      ${items.length ? `<div class="library-grid">${items.map((item) => {
        const state = mediaState(item);
        const canWatch = state === 'ready' && item.streaming_enabled === true;
        const canDownload = state === 'ready' && item.download_enabled === true;
        const unavailableText = state === 'processing' ? 'Preparing your video…' : 'Video temporarily unavailable';
        return `<article class="library-card">
          <div class="library-card-media"><div class="product-thumb large"><span>▶</span></div><span class="library-status ${state}">${state === 'ready' ? 'Ready to watch' : unavailableText}</span></div>
          <div class="library-copy">
            <p class="eyebrow">Purchased</p>
            <h2>${escapeHtml(item.title)}</h2>
            <p>${escapeHtml(item.description || 'Purchased video product.')}</p>
            ${item.purchased_at ? `<p class="library-meta">Purchased ${escapeHtml(new Date(item.purchased_at).toLocaleDateString())}</p>` : ''}
            <div class="library-actions">
              ${canWatch ? `<a class="button" href="#/watch/${encodeURIComponent(item.product_id)}">Watch</a>` : ''}
              ${canDownload ? `<a class="button secondary" href="${mediaDownloadUrl(item.product_id)}">Download</a>` : ''}
              ${state !== 'ready' ? `<span class="microcopy">${escapeHtml(unavailableText)}</span>` : ''}
            </div>
          </div>
        </article>`;
      }).join('')}</div>` : '<div class="empty-state"><h2>Your library is empty</h2><p>Once you purchase a published video, it will appear here.</p><a class="button" href="#/browse">Browse videos</a></div>'}
    </section>`;
  } catch (error) {
    if (error.status === 401) { location.hash = '#/login?return=/library'; return; }
    root.innerHTML = '<section class="library-page"><div class="empty-state"><h2>Library unavailable</h2><p>Please try again shortly.</p><a class="button secondary" href="#/browse">Return to catalog</a></div></section>';
  }
}

export function renderWatch(root, productId) {
  root.innerHTML = `<section class="watch-page"><div class="watch-heading"><div><p class="eyebrow">SECURE PLAYER</p><h1>Your video</h1><p class="microcopy">Playback is protected by your active purchase entitlement.</p></div><a class="button secondary" href="#/library">Back to library</a></div><div class="player-shell"><video class="secure-player" controls preload="metadata" src="${mediaStreamUrl(productId)}">Your browser does not support video playback.</video></div><div class="watch-help"><strong>Secure playback</strong><span>Video access is checked on the server for every request.</span></div></section>`;
}