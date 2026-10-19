import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const account = fs.readFileSync(path.join(root, 'account.html'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'orders.html'), 'utf8');
const library = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const buyerRegister = fs.readFileSync(path.join(root, 'pages/buyer-register.html'), 'utf8');
const authApi = fs.readFileSync(path.join(root, 'app/auth/auth-api.js'), 'utf8');
const authRoutes = fs.readFileSync(path.join(root, 'backend/src/auth-routes.js'), 'utf8');

for (const html of [account, orders, library]) {
  assert.match(html, /credentials:\s*['"]same-origin['"]/);
}
assert.match(account, /\/api\/orders/);
assert.match(account, /\/api\/library/);
assert.match(account, /\/orders\.html/);
assert.match(account, /\/library\.html/);
assert.match(orders, /\/api\/orders/);
assert.match(orders, /\/account\.html/);
assert.match(orders, /\/library\.html/);
assert.match(library, /\/api\/library/);
assert.match(library, /\/account\.html/);
assert.match(library, /\/orders\.html/);
assert.match(library, /\/api\/media\//);
assert.match(library, /\/stream/);
assert.match(library, /\/download/);
assert.match(buyerRegister, /id="buyer-register-form"/);
assert.match(buyerRegister, /authApi\.register\(email, password, name\)/);
assert.match(buyerRegister, /password !== passwordConfirm/);
assert.match(buyerRegister, /name="terms" required/);
assert.match(authApi, /register: \(email, password, displayName = ''\)/);
assert.match(authRoutes, /display_name/);
console.log('Buyer account/order/library and registration static contract checks passed.');
