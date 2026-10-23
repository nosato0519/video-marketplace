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
assert.match(favorites, /video-marketplace-favorites/);
assert.match(favorites, /\/api\/catalog\/products\?locale=ja/);
assert.match(favorites, /お気に入りから削除/);
assert.match(favorites, /requestedId/);
const libraryPage = fs.readFileSync(path.join(root, 'pages/library.html'), 'utf8');
const purchaseHistory = fs.readFileSync(path.join(root, 'pages/purchase-history.html'), 'utf8');
const orderDetail = fs.readFileSync(path.join(root, 'pages/order-detail.html'), 'utf8');
assert.match(libraryPage, /libraryApi\.list\(\)/);
assert.match(libraryPage, /data-library-filter="available"/);
assert.match(libraryPage, /data-library-filter="downloadable"/);
assert.match(libraryPage, /data-streaming-enabled/);
assert.match(libraryPage, /item\.streaming_enabled && item\.media_status === "ready"/);
assert.match(libraryPage, /streamingAvailable \? "視聴する →" : "視聴準備中"/);
assert.match(libraryPage, /query\.set\('page', String\(target\)\)/);
assert.match(libraryPage, /filterEmpty/);
assert.match(purchaseHistory, /libraryApi\.orders\(\)/);
assert.match(purchaseHistory, /order\.paidAt \|\| order\.createdAt/);
assert.match(orderDetail, /order\.paidAt \|\| order\.createdAt/);
assert.match(orderDetail, /order\.status === "paid"/);
assert.match(orderDetail, /if \(!canAccessLibrary\) content\.querySelectorAll/);
assert.doesNotMatch(libraryPage, /THE LAST SIGNAL/);
assert.doesNotMatch(purchaseHistory, /THE LAST SIGNAL/);
const buyerDashboard = fs.readFileSync(path.join(root, 'pages/buyer.html'), 'utf8');
assert.match(buyerDashboard, /libraryApi\.list\(\)/);
assert.match(buyerDashboard, /libraryApi\.orders\(\)/);
assert.match(buyerDashboard, /buyer-video-count/);
assert.match(buyerDashboard, /!\["buyer", "seller"\]\.includes\(user\?\.role\)/);
assert.match(buyerDashboard, /item\.streaming_enabled && item\.media_status === "ready"/);
assert.doesNotMatch(buyerDashboard, /THE LAST SIGNAL/);
const watchPage = fs.readFileSync(path.join(root, 'pages/watch.html'), 'utf8');
assert.match(watchPage, /libraryApi\.list\(\)/);
assert.match(watchPage, /mediaStreamUrl\(productId\)/);
assert.match(watchPage, /mediaDownloadUrl\(productId\)/);
assert.match(watchPage, /item\.streaming_enabled && item\.media_status === "ready"/);
assert.match(watchPage, /item\.download_enabled && item\.media_status === "ready"/);
assert.match(watchPage, /購入済み作品を読み込めませんでした/);

const cart = fs.readFileSync(path.join(root, 'pages/cart.html'), 'utf8');
assert.match(cart, /video-marketplace-cart/);
assert.match(cart, /\/api\/catalog\/products\//);
assert.match(cart, /cart-clear/);
assert.match(cart, /この作品を購入/);
assert.match(cart, /\/pages\/checkout\.html\?productId=/);
const buyerLogin = fs.readFileSync(path.join(root, 'pages/buyer-login.html'), 'utf8');
const appSource = fs.readFileSync(path.join(root, 'backend/src/app.js'), 'utf8');
const allowedInlineScriptHashes = [...appSource.matchAll(/'sha256-([^']+)'/g)].map((match) => match[1]);
for (const [pageName, pageSource] of [
  ['buyer registration', buyerRegister],
  ['buyer login', buyerLogin],
  ['buyer dashboard', buyerDashboard],
]) {
  const scripts = [...pageSource.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0, `${pageName} module script exists`);
  for (const [, script] of scripts) {
    const hash = crypto.createHash('sha256').update(script).digest('base64');
    assert.ok(allowedInlineScriptHashes.includes(hash), `${pageName} module script is allowed by CSP`);
  }
}
assert.match(buyerLogin, /startsWith\('\/pages\/checkout\.html\?productId='/);
assert.match(buyerLogin, /redirectTo\s*\}/);
const accountSettings = fs.readFileSync(path.join(root, 'pages/account-settings.html'), 'utf8');
assert.match(accountSettings, /authApi\.updateProfile/);
assert.match(accountSettings, /passwordConfirm/);
assert.match(authApi, /updateProfile: \(profile\)/);
console.log('Buyer account/order/library and registration static contract checks passed.');
