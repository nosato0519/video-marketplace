import { libraryApi } from "/app/library/library-api.js";

const root = document.querySelector("[data-pagination]");
const list = document.querySelector(".buyer-history-list");

function renderPagination() {
  if (!root || !list) return;
  const items = Array.from(list.querySelectorAll(".buyer-history-card"));
  const perPage = 16;
  const totalPages = Math.max(1, Math.ceil(items.length / perPage));
  const params = new URLSearchParams(window.location.search);
  const page = Math.min(Math.max(Number(params.get("page")) || 1, 1), totalPages);
  items.forEach((item, index) => {
    item.hidden = index < (page - 1) * perPage || index >= page * perPage;
  });
  root.replaceChildren();
  root.hidden = totalPages <= 1;
  const addLink = (label, target, active = false) => {
    const link = document.createElement("a");
    link.href = target === 1 ? window.location.pathname : window.location.pathname + "?page=" + target;
    link.textContent = label;
    if (active) link.className = "active";
    root.append(link);
  };
  if (page > 1) addLink("‹", page - 1);
  for (let number = 1; number <= totalPages; number += 1) addLink(String(number), number, number === page);
  if (page < totalPages) addLink("›", page + 1);
}

window.renderBuyerHistoryPagination = renderPagination;

if (list) {
  try {
    const result = await libraryApi.orders();
    const orders = result.items || [];
    list.innerHTML = orders.length ? orders.map((order) => {
      const amount = new Intl.NumberFormat("ja-JP", { style: "currency", currency: order.currency || "JPY" }).format(Number(order.amount || 0));
      const orderDate = order.paidAt || order.createdAt;
      const date = orderDate ? new Date(orderDate).toLocaleDateString("ja-JP") : "—";
      const escape = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
      return `<article class="buyer-history-card">
        <div class="library-thumb catalog-t1"></div>
        <div class="buyer-history-info">
          <strong>${escape(order.title || "購入作品")}</strong>
          <span>購入日 ${escape(date)}</span>
          <small>${escape(amount)} ・ ${escape(order.status || "")}</small>
        </div>
        <a href="/pages/order-detail.html?orderId=${encodeURIComponent(order.orderId)}">注文詳細を見る →</a>
      </article>`;
    }).join("") : '<div class="empty-state"><h2>購入履歴はありません</h2><p>動画を購入すると、ここに履歴が表示されます。</p><a class="button" href="/pages/video-list.html">動画を探す</a></div>';
    renderPagination();
  } catch (error) {
    if (error.status === 401) {
      window.location.assign("/pages/buyer-login.html");
    } else {
      list.innerHTML = '<div class="empty-state"><h2>購入履歴を取得できません</h2><p>しばらくしてからもう一度お試しください。</p></div>';
      renderPagination();
    }
  }
}
