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

function renderThumbnail(container, url, title) {
  container.className = "library-thumb";
  container.style.cssText = "overflow:hidden;display:grid;place-items:center";
  if (!url) {
    container.textContent = "VIDEO";
    return;
  }
  const image = document.createElement("img");
  image.src = url;
  image.alt = title || "購入作品";
  image.loading = "lazy";
  image.style.cssText = "display:block;width:100%;height:100%;object-fit:cover";
  image.addEventListener("error", () => { container.textContent = "VIDEO"; }, { once: true });
  container.replaceChildren(image);
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
  const isCancelled = ["cancelled", "failed"].includes(order.status);
  const isRefunded = order.status === "refunded";
  const libraryItem = (libraryResult.items || []).find((item) => String(item.order_id) === String(order.orderId));
  const hasAccess = isPaid && Boolean(libraryItem);

  if (isPaid) {
    heading.textContent = hasAccess ? "購入が完了しました" : "決済が完了しました";
    lead.textContent = hasAccess
      ? "購入した動画はマイライブラリから確認できます。"
      : "決済は完了していますが、ライブラリへの反映を確認できません。時間をおいて再読み込みしてください。";
  } else if (isRefunded) {
    heading.textContent = "返金が完了しました";
    lead.textContent = "返金処理が完了しました。この注文で購入した作品の視聴権限は取り消されています。";
  } else if (isCancelled) {
    heading.textContent = "決済は完了していません";
    lead.textContent = "この注文はキャンセルされています。購入を続ける場合は、動画一覧から作品を選び直してください。";
  } else {
    heading.textContent = "決済状況を確認しています";
    lead.textContent = "決済の確定を待っています。購入履歴で注文状況をご確認ください。";
  }

  orderNumber.textContent = "注文番号 #" + order.orderId;
  list.replaceChildren();

  const article = document.createElement("article");
  article.className = "buyer-history-card";
  const thumb = document.createElement("div");
  renderThumbnail(thumb, order.thumbnailUrl || libraryItem?.thumbnail_url, order.title || libraryItem?.title);
  const info = document.createElement("div");
  info.className = "buyer-history-info";
  const title = document.createElement("strong");
  title.textContent = order.title || libraryItem?.title || "購入作品";
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

  const paymentStatus = isPaid ? "完了" : isRefunded ? "返金済み" : isCancelled ? "キャンセル" : String(order.status || "確認中");
  const accessStatus = hasAccess ? "可能" : isRefunded || isCancelled ? "不可" : "未確認";
  summary.replaceChildren(
    summaryValue("商品数", "1", "作品"),
    summaryValue("購入金額", money(order.amount, order.currency), order.currency || "JPY"),
    summaryValue("決済", paymentStatus, "注文ステータス"),
    summaryValue("視聴", accessStatus, "マイライブラリ")
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
