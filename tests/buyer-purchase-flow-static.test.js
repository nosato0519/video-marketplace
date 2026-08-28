const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const product = fs.readFileSync(path.join(root, 'product.html'), 'utf8');
const library = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const orders = fs.readFileSync(path.join(root, 'orders.html'), 'utf8');

assert.match(product, /\/api\/catalog\/products\//);
assert.match(product, /\/api\/orders/);
assert.match(product, /\/api\/checkout/);
assert.match(product, /credentials:\s*['"]same-origin['"]/);
assert.match(product, /orderId/);
assert.match(product, /checkout_url/);

assert.match(orders, /\/api\/orders/);
assert.match(orders, /\/library\.html/);

assert.match(library, /\/api\/library/);
assert.match(library, /\/api\/media\//);
assert.match(library, /\/stream/);
assert.match(library, /\/download/);
assert.match(library, /credentials:\s*['"]same-origin['"]/);
assert.match(library, /status===401/);

console.log('Buyer purchase-to-library static contract checks passed.');
