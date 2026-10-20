import { libraryApi } from "/app/library/library-api.js";

const contentRoot = document.querySelector("#order-content");
const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));

try {
  const orderId = new URLSearchParams(window.location.search).get("orderId");
  if (!orderId) throw new Error("ORDER_NOT_FOUND");
  const [ordersResult, libraryResult] = await Promise.all([libraryApi.orders(), libraryApi.list()]);
  const order = (ordersResult.items || []).find((item) => String(item.orderId) === String(orderId));
  if (!order) throw new Error("ORDER_NOT_FOUND");

  const amount = new Intl.NumberFormat("ja-JP", { style: "currency", currency: order.currency || "JPY" }).format(Number(order.amount || 0));
  const orderDate = order.paidAt || order.createdAt;
  const date = orderDate ? new Date(orderDate).toLocaleDateString("ja-JP") : "—";
  const status = order.status || "—";
  const hasLibraryAccess = (libraryResult.items || []).some((item) => String(item.product_id) === String(order.productId));
  const canAccessLibrary = order.status === "paid" && hasLibraryAccess;
  const title = escapeHtml(order.title || "購入作品");
  const safeOrderId = escapeHtml(order.orderId);
  const safeDate = escapeHtml(date);
  const safeAmount = escapeHtml(amount);
  const safeCurrency = escapeHtml(order.currency || "JPY");
  const safeStatus = escapeHtml(status);

  const accessMessage = order.status === "paid" && !hasLibraryAccess
    ? '<p class="empty-state">決済は完了していますが、ライブラリへの反映を確認できません。時間をおいて再読み込みしてください。</p>'
    : '';

  contentRoot.innerHTML =
    '<section class="buyer-section"><div class="buyer-section-head"><div><span class="section-kicker">ORDER</span><h2>注文 #' + safeOrderId + '</h2></div><span>' + safeStatus + '</span></div><div class="buyer-history-list"><article class="buyer-history-card"><div class="library-thumb catalog-t1"></div><div class="buyer-history-info"><strong>' + title + '</strong><span>購入日 ' + safeDate + '</span><small>' + safeAmount + '</small></div><a href="/pages/library.html">ライブラリで見る →</a></article></div></section>' +
    '<section class="buyer-section"><div class="buyer-section-head"><div><span class="section-kicker">PAYMENT</span><h2>決済情報</h2></div></div><div class="buyer-summary buyer-order-summary"><div><span>商品数</span><strong>1</strong><small>作品</small></div><div><span>購入金額</span><strong>' + safeAmount + '</strong><small>' + safeCurrency + '</small></div><div><span>決済状態</span><strong>' + safeStatus + '</strong><small>注文ステータス</small></div><div><span>購入日</span><strong>' + safeDate + '</strong><small>注文日時</small></div></div></section>' +
    accessMessage +
    '<section class="buyer-section"><div class="buyer-section-head"><div><span class="section-kicker">LIBRARY</span><h2>購入後の操作</h2></div></div><div class="buyer-action-row"><a class="buyer-account" href="/pages/purchase-history.html">購入履歴へ戻る</a><a class="primary" href="/pages/library.html">マイライブラリへ →</a></div></section>';

  if (!canAccessLibrary) contentRoot.querySelectorAll('a[href="/pages/library.html"]').forEach((link) => link.remove());
} catch (error) {
  if (error.status === 401) {
    window.location.assign("/pages/buyer-login.html");
  } else {
    contentRoot.innerHTML = '<section class="buyer-section"><div class="empty-state"><h2>注文を取得できません</h2><p>購入履歴から対象の注文を選択してください。</p><a class="button" href="/pages/purchase-history.html">購入履歴へ戻る</a></div></section>';
  }
}
