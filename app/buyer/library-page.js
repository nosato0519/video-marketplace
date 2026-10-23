import { libraryApi } from "/app/library/library-api.js";

const root = document.querySelector("[data-pagination]");
const list = document.querySelector(".library-grid");

function renderLibraryPagination() {
  if (!root || !list) return;
  const allItems = Array.from(list.querySelectorAll(".library-card"));
  const params = new URLSearchParams(window.location.search);
  const filter = params.get("filter") || "all";
  const matches = (item) => {
    if (filter === "available") return item.dataset.streamingEnabled === "true";
    if (filter === "unavailable") return item.dataset.streamingEnabled !== "true";
    if (filter === "downloadable") return item.dataset.downloadEnabled === "true";
    return true;
  };
  allItems.forEach((item) => { item.hidden = !matches(item); });
  const items = allItems.filter(matches);
  const perPage = 16;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  let page = Number(params.get("page")) || 1;
  page = Math.min(Math.max(page, 1), totalPages);
  items.forEach((item, index) => {
    item.hidden = index < (page - 1) * perPage || index >= page * perPage;
  });

  root.replaceChildren();
  root.hidden = totalPages <= 1;
  document.querySelectorAll("[data-library-filter]").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.libraryFilter === filter);
    tab.setAttribute("aria-current", tab.dataset.libraryFilter === filter ? "page" : "false");
  });

  let empty = list.querySelector(".empty-state");
  if (!items.length && !empty) {
    empty = document.createElement("p");
    empty.className = "empty-state";
    empty.dataset.filterEmpty = "true";
    empty.textContent = "この条件に合う購入作品はありません。";
    list.append(empty);
  } else if (items.length && empty?.dataset.filterEmpty === "true") {
    empty.remove();
  }
  if (totalPages <= 1) return;

  const makeLink = (label, target, active = false) => {
    const link = document.createElement("a");
    const query = new URLSearchParams(window.location.search);
    if (target === 1) query.delete("page");
    else query.set("page", String(target));
    link.href = window.location.pathname + (query.toString() ? "?" + query.toString() : "");
    link.textContent = label;
    if (active) link.className = "active";
    return link;
  };
  if (page > 1) root.append(makeLink("‹", page - 1));
  for (let number = 1; number <= totalPages; number += 1) root.append(makeLink(String(number), number, number === page));
  if (page < totalPages) root.append(makeLink("›", page + 1));
}
window.renderLibraryPagination = renderLibraryPagination;

if (list) {
  try {
    const result = await libraryApi.list();
    const items = result.items || [];
    const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
    list.innerHTML = items.length ? items.map((item) => {
      const date = item.purchased_at ? new Date(item.purchased_at).toLocaleDateString("ja-JP") : "—";
      const quality = item.media_mime_type || "VIDEO";
      const streamingAvailable = item.streaming_enabled && item.media_status === "ready";
      const downloadAvailable = item.download_enabled && item.media_status === "ready";
      const watchHref = streamingAvailable ? "/pages/watch.html?productId=" + encodeURIComponent(item.product_id) : "#";
      const downloadHref = downloadAvailable ? "/api/media/" + encodeURIComponent(item.product_id) + "/download" : "#";
      const downloadHidden = downloadAvailable ? "" : ' aria-hidden="true" style="visibility:hidden"';
      const thumbnail = item.thumbnail_url
        ? '<img src="' + escape(item.thumbnail_url) + '" alt="' + escape(item.title || "購入作品") + '" loading="lazy" style="display:block;width:100%;height:100%;object-fit:cover">'
        : '<span>VIDEO</span>';
      return `<article class="library-card" data-streaming-enabled="${streamingAvailable ? "true" : "false"}" data-download-enabled="${downloadAvailable ? "true" : "false"}">
        <div class="library-thumb" style="overflow:hidden;display:grid;place-items:center">${thumbnail}</div>
        <div class="library-card-body">
          <h2>${escape(item.title || "購入作品")}</h2>
          <div class="library-card-meta"><span>購入日 ${escape(date)}</span><span>${escape(quality)}</span></div>
          <div class="library-progress"><span class="library-progress-value is-progress-0"></span></div>
          <div class="library-card-actions"><a class="library-watch" href="${watchHref}">${streamingAvailable ? "視聴する →" : "視聴準備中"}</a><a class="library-link" href="${downloadHref}"${downloadHidden}>ダウンロード</a></div>
        </div>
      </article>`;
    }).join("") : '<div class="empty-state" data-library-empty="true"><h2>ライブラリは空です</h2><p>購入した動画がここに表示されます。</p><a class="button" href="/pages/video-list.html">動画を探す</a></div>';
    list.querySelectorAll(".library-thumb img").forEach((image) => {
      image.addEventListener("error", () => {
        const fallback = document.createElement("span");
        fallback.textContent = "VIDEO";
        image.replaceWith(fallback);
      }, { once: true });
    });
    renderLibraryPagination();
  } catch (error) {
    if (error.status === 401) {
      window.location.assign("/pages/buyer-login.html");
    } else {
      list.innerHTML = '<div class="empty-state"><h2>ライブラリを取得できません</h2><p>しばらくしてからもう一度お試しください。</p></div>';
      renderLibraryPagination();
    }
  }
}
