const productId = new URLSearchParams(window.location.search).get("productId");
const buy = document.querySelector(".detail-buy-primary");
const cart = document.querySelector(".detail-buy-secondary");
const favorite = document.querySelector(".detail-favorite");

if (!productId) {
  const showMissingProduct = (event) => {
    event.preventDefault();
    window.alert("作品を読み込めませんでした。動画一覧から選び直してください。");
  };
  buy?.addEventListener("click", showMissingProduct);
  cart?.addEventListener("click", showMissingProduct);
} else {
  const encodedProductId = encodeURIComponent(productId);
  if (favorite) favorite.href = "/pages/favorites.html?productId=" + encodedProductId;
  if (buy) buy.href = "/pages/checkout.html?productId=" + encodedProductId;
  if (cart) cart.href = "/pages/cart.html?productId=" + encodedProductId;
}
