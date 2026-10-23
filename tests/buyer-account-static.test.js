import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const buyerRegister = fs.readFileSync(path.join(root, 'pages/buyer-register.html'), 'utf8');
const authApi = fs.readFileSync(path.join(root, 'app/auth/auth-api.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(root, 'backend/src/auth-routes.js'), 'utf8');

assert.match(buyerRegister, /id="buyer-register-form"/);
assert.match(buyerRegister, /authApi\.register\(email, password, name\)/);
assert.match(buyerRegister, /password !== passwordConfirm/);
assert.match(buyerRegister, /name="terms" required/);
assert.match(authApi, /register: \(email, password, displayName = ''\)/);
assert.match(authRoutes, /display_name/);
assert.match(authRoutes, /app\.patch\('\/api\/auth\/profile'/);
assert.match(authRoutes, /CURRENT_PASSWORD_INVALID/);
assert.match(buyerRegister, /window\.location\.assign\('\/pages\/buyer\.html'\)/);
const checkout = fs.readFileSync(path.join(root, 'pages/checkout.html'), 'utf8');
const checkoutScript = fs.readFileSync(path.join(root, 'app/checkout/checkout-page.js'), 'utf8');
const productDetail = fs.readFileSync(path.join(root, 'pages/product-detail.html'), 'utf8');
const productDetailActions = fs.readFileSync(path.join(root, 'app/catalog/product-detail-actions.js'), 'utf8');
assert.match(checkoutScript, /checkoutApi\.purchaseIntent\(productId, 'ja'\)/);
assert.match(checkoutScript, /checkoutApi\.createOrder\(productId\)/);
assert.match(checkoutScript, /checkoutApi\.paymentProviders\(\)/);
assert.match(checkoutScript, /checkoutApi\.checkout\(order\.order\.id, selectedProvider\)/);
assert.match(checkout, /id="checkout-submit"/);
assert.match(checkout, /id="checkout-payment-list"/);
assert.match(checkout, /\/app\/checkout\/checkout-page\.js/);
assert.match(productDetailActions, /buy\.href = "\/pages\/checkout\.html\?productId=" \+ encodedProductId/);
const favorites = fs.readFileSync(path.join(root, 'pages/favorites.html'), 'utf8');
const favoritesScript = fs.readFileSync(path.join(root, 'app/catalog/favorites.js'), 'utf8');
const favoritesClient = favorites + favoritesScript;
assert.match(favoritesClient, /video-marketplace-favorites/);
assert.match(favoritesScript, /\/api\/catalog\/products\?locale=ja&limit=50&page=/);
assert.match(favoritesScript, /お気に入りから削除/);
assert.match(favoritesScript, /requestedId/);

const libraryPage = fs.readFileSync(path.join(root, 'pages/library.html'), 'utf8');
const libraryPageScript = fs.readFileSync(path.join(root, 'app/buyer/library-page.js'), 'utf8');
const libraryView = fs.readFileSync(path.join(root, 'app/library/library-view.js'), 'utf8');
const libraryClient = [libraryPage, libraryPageScript, libraryView].join('\n');
const purchaseHistory = fs.readFileSync(path.join(root, 'pages/purchase-history.html'), 'utf8');
const purchaseHistoryScript = fs.readFileSync(path.join(root, 'app/buyer/purchase-history.js'), 'utf8');
const purchaseHistoryClient = [purchaseHistory, purchaseHistoryScript].join('\n');
const orderDetail = fs.readFileSync(path.join(root, 'pages/order-detail.html'), 'utf8');
const orderDetailScript = fs.readFileSync(path.join(root, 'app/buyer/order-detail.js'), 'utf8');
const orderDetailClient = [orderDetail, orderDetailScript].join('\n');
assert.match(libraryClient, /libraryApi\.list\(\)/);
assert.match(libraryPage, /data-library-filter="available"/);
assert.match(libraryPage, /data-library-filter="downloadable"/);
assert.match(libraryPageScript, /item\.streaming_enabled/);
assert.match(libraryPageScript, /item\.media_status === "ready"/);
assert.match(libraryPageScript, /query\.set\("page", String\(target\)\)/);
assert.match(libraryPageScript, /filterEmpty/);
assert.match(purchaseHistoryClient, /libraryApi\.orders\(\)/);
assert.match(purchaseHistoryScript, /order\.paidAt \|\| order\.createdAt/);
assert.match(orderDetailScript, /order\.paidAt \|\| order\.createdAt/);
assert.match(orderDetailScript, /order\.status === "paid"/);
assert.match(orderDetailScript, /if \(!canAccessLibrary\) contentRoot\.querySelectorAll/);
assert.doesNotMatch(libraryClient, /THE LAST SIGNAL/);
assert.doesNotMatch(purchaseHistoryClient, /THE LAST SIGNAL/);

const buyerDashboard = fs.readFileSync(path.join(root, 'pages/buyer.html'), 'utf8');
const buyerDashboardScript = fs.readFileSync(path.join(root, 'app/buyer/buyer-dashboard.js'), 'utf8');
const buyerDashboardClient = [buyerDashboard, buyerDashboardScript].join('\n');
assert.match(buyerDashboardClient, /libraryApi\.list\(\)/);
assert.match(buyerDashboardClient, /libraryApi\.orders\(\)/);
assert.match(buyerDashboardClient, /buyer-video-count/);
assert.match(buyerDashboardScript, /!\["buyer", "seller"\]\.includes\(user\?\.role\)/);
assert.match(buyerDashboardScript, /item\.streaming_enabled && item\.media_status === "ready"/);
assert.doesNotMatch(buyerDashboardClient, /THE LAST SIGNAL/);
const watchPage = fs.readFileSync(path.join(root, 'pages/watch.html'), 'utf8');
assert.match(watchPage, /libraryApi\.list\(/);
assert.match(watchPage, /mediaStreamUrl\(productId\)/);
assert.match(watchPage, /mediaDownloadUrl\(productId\)/);
assert.match(watchPage, /item\.streaming_enabled && item\.media_status === "ready"/);
assert.match(watchPage, /item\.download_enabled && item\.media_status === "ready"/);
assert.match(watchPage, /購入済み作品を読み込めませんでした/);

const cart = fs.readFileSync(path.join(root, 'pages/cart.html'), 'utf8');
const cartScript = fs.readFileSync(path.join(root, 'app/catalog/cart.js'), 'utf8');
const cartClient = [cart, cartScript].join('\n');
assert.match(cartClient, /video-marketplace-cart/);
assert.match(cartScript, /\/api\/catalog\/products\//);
assert.match(cartClient, /cart-clear/);
assert.match(cartClient, /この作品を購入/);
assert.match(cartClient, /\/pages\/checkout\.html\?productId=/);
const buyerLogin = fs.readFileSync(path.join(root, 'pages/buyer-login.html'), 'utf8');
const authView = fs.readFileSync(path.join(root, 'app/auth/auth-view.js'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8');
const allowedInlineScriptHashes = [...appSource.matchAll(/'sha256-([^']+)'/g)].map((match) => match[1]);
for (const [pageName, pageSource] of [
  ['buyer registration', buyerRegister],
  ['buyer login', buyerLogin],
  ['buyer dashboard', buyerDashboard],
]) {
  const inlineScripts = [...pageSource.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  const externalScripts = [...pageSource.matchAll(/<script type="module"\s+src="([^"]+)"/g)];
  assert.ok(inlineScripts.length + externalScripts.length > 0, `${pageName} module script exists`);
  for (const [, script] of inlineScripts) {
    const hash = crypto.createHash('sha256').update(script).digest('base64');
    assert.ok(allowedInlineScriptHashes.includes(hash), `${pageName} inline module script is allowed by CSP`);
  }
  for (const [, src] of externalScripts) {
    assert.ok(src.startsWith('/'), `${pageName} external module script is same-origin`);
  }
}
assert.match(authView, /requestedNext\.startsWith\('\/pages\/checkout\.html\?productId='\)/);
assert.match(authView, /redirectTo,/);
const accountSettings = fs.readFileSync(path.join(root, 'pages/account-settings.html'), 'utf8');
const accountSettingsScript = fs.readFileSync(path.join(root, 'app/buyer/account-settings.js'), 'utf8');
assert.match(accountSettingsScript, /authApi\.updateProfile/);
assert.match(accountSettingsScript, /passwordConfirm/);
assert.match(authApi, /updateProfile: \(profile\)/);
console.log('Buyer account/order/library and registration static contract checks passed.');
