const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const account = fs.readFileSync(path.join(root, 'account.html'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'orders.html'), 'utf8');
const library = fs.readFileSync(path.join(root, 'library.html'), 'utf8');

for (const html of [account, orders, library]) {
  assert.match(html, /credentials:'same-origin'/);
  assert.match(html, /\/api\/(orders|library)/);
}

assert.match(account, /\/orders\.html/);
assert.match(account, /\/library\.html/);
assert.match(orders, /\/account\.html/);
assert.match(orders, /\/library\.html/);
assert.match(library, /\/account\.html/);
assert.match(library, /\/orders\.html/);
assert.match(library, /\/api\/media\//);
assert.match(library, /\/stream/);
assert.match(library, /\/download/);

console.log('Buyer account/order/library static contract checks passed.');
