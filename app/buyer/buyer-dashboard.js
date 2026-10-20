import { authApi } from "/app/auth/auth-api.js";
import { libraryApi } from "/app/library/library-api.js";

const setText = (id, value) => {
  const node = document.getElementById(id);
  if (node) node.textContent = String(value);
};

async function loadFavoriteCount() {
  try {
    const response = await fetch("/api/buyer/favorites", {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" }
    });
    if (!response.ok) throw new Error("お気に入りを取得できませんでした。");
    const result = await response.json();
    return Array.isArray(result.productIds) ? result.productIds.length : 0;
  } catch {
    const saved = JSON.parse(window.localStorage.getItem("video-marketplace-favorites") || "[]");
    return Array.isArray(saved) ? saved.length : 0;
  }
}

try {
  const { user } = await authApi.me();
  if (!["buyer", "seller"].includes(user?.role)) throw new Error("ROLE_NOT_ALLOWED");

  const [libraryResult, orderResult, favoriteCount] = await Promise.all([
    libraryApi.list(),
    libraryApi.orders(),
    loadFavoriteCount()
  ]);
  const items = libraryResult.items || [];
  const orders = orderResult.items || [];

  setText("buyer-video-count", items.length);
  setText("buyer-watching-count", items.filter((item) => item.streaming_enabled && item.media_status === "ready").length);
  setText("buyer-favorite-count", favoriteCount);
  setText("buyer-order-count", orders.length);

  const recent = document.getElementById("buyer-recent-items");
  recent.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "購入した動画はまだありません。";
    recent.append(empty);
  } else {
    items.slice(0, 3).forEach((item) => {
      const card = document.createElement("article");
      card.className = "buyer-recent-card";
      const thumb = document.createElement("div");
      thumb.className = "library-thumb";
      const body = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = item.title || "購入作品";
      const date = document.createElement("span");
      date.textContent = item.purchased_at ? "購入日 " + new Date(item.purchased_at).toLocaleDateString("ja-JP") : "購入済み";
      body.append(title, date);
      if (item.streaming_enabled && item.media_status === "ready") {
        const watch = document.createElement("a");
        watch.href = "/pages/watch.html?productId=" + encodeURIComponent(item.product_id);
        watch.textContent = "視聴する →";
        body.append(watch);
      } else {
        const availability = document.createElement("span");
        availability.textContent = "視聴準備中";
        body.append(availability);
      }
      card.append(thumb, body);
      recent.append(card);
    });
  }
} catch (error) {
  if (error.status === 401 || error.message === "ROLE_NOT_ALLOWED") {
    window.location.assign("/pages/buyer-login.html");
  } else {
    document.getElementById("buyer-recent-items").textContent = "購入者情報を読み込めませんでした。";
  }
}
