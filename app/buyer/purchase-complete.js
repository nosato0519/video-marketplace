import { libraryApi } from "/app/library/library-api.js";

const heading = document.querySelector("[data-purchase-heading]");
const lead = document.querySelector("[data-purchase-lead]");
const orderNumber = document.querySelector("[data-order-number]");
const list = document.querySelector("[data-purchase-items]");
const summary = document.querySelector("[data-purchase-summary]");

function money(amount, currency = "JPY") {
  try {
    return new Intl.NumberFormat("ja-JP", { style: "currency", currency }).format(Number(amount || 0));
  } catch {
    return String(amount ?? "—") + " " + currency;
  }
}

function summaryValue(label, value, note) {
  const card = document.createElement("div");
  const title = document.createElement("span");
  title.textContent = label;
  const strong = document.createElement("strong");
  strong.textContent = value;
  const small = document.createElement("small");
  small.textContent = note;
  card.append(title, strong, small);
  return card;
}

try {
  const params = new URLSearchParams(window.location.search);
  const requestedId = params.get("orderId");
  const waitForWebhook = Boolean(params.get("session_id"));
  let ordersResult;
  let libraryResult;
  let order;

  for (let attempt = 0; attempt < (waitForWebhook ? 10 : 1); attempt += 1) {
    [ordersResult, libraryResult] = await Promise.all([libraryApi.orders(), libraryApi.list()]);
    const orders = ordersResult.items || [];
    order = requestedId
      ? orders.find((item) => String(item.orderId) === requestedId)
      : orders[0];

    if (!waitForWebhook || (order && order.status !== "pending") || attempt === 9) break;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  if (!order) throw new Error("注文情報が見つかりません。購入履歴から注文をご確認ください。");

  const isPaid = order.status === "paid";
  const hasAccess = (libraryResult.items || []).some((item) => String(item.order_id) === String(order.orderId));
  heading.textContent = isPaid
    ? (hasAccess ? "購入が完了しました" : "決済が完了しました")
    : "決済状況を確認しています";
  lead.textContent = isPaid
    ? (hasAccess
      ? "購入した動画はマイライブラリから確認できます。"
      : "決済は完了していますが、ライブラリへの反映を確認できません。時間をおいて再読み込みしてください。")
    : "決済の確定を待っています。購入履歴で注文状況をご確認ください。";
  orderNumber.textContent = "注文番号 #" + order.orderId;
  list.replaceChildren();

  const article = document.createElement("article");
  article.className = "buyer-history-card";
  const thumb = document.createElement("div");
  thumb.className = "library-thumb";
  const info = document.createElement("div");
  info.className = "buyer-history-info";
  const title = document.createElement("strong");
  title.textContent = order.title || "購入作品";
  const date = document.createElement("span");
  date.textContent = "注文日 " + (order.createdAt ? new Date(order.createdAt).toLocaleDateString("ja-JP") : "—");
  const price = document.createElement("small");
  price.textContent = money(order.amount, order.currency);
  info.append(title, date, price);
  const detail = document.createElement("a");
  detail.className = "cart-view-link";
  detail.href = "/pages/order-detail.html?orderId=" + encodeURIComponent(order.orderId);
  detail.textContent = "注文詳細を見る →";
  article.append(thumb, info, detail);
  list.append(article);

  summary.replaceChildren(
    summaryValue("商品数", "1", "作品"),
    summaryValue("購入金額", money(order.amount, order.currency), order.currency || "JPY"),
    summaryValue("決済", isPaid ? "完了" : String(order.status || "確認中"), "注文ステータス"),
    summaryValue("視聴", hasAccess ? "可能" : "未確認", "マイライブラリ")
  );
} catch (error) {
  if (error.status === 401) {
    window.location.assign("/pages/buyer-login.html");
  } else {
    heading.textContent = "注文情報を表示できません";
    lead.textContent = error.message || "購入履歴から注文状況をご確認ください。";
    orderNumber.textContent = "";
    list.replaceChildren();
    summary.replaceChildren();
  }
}
