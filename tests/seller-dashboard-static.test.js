const fs = require('fs');
const path = require('path');
const assert = require('assert');

const file = path.resolve(__dirname, '..', 'seller', 'dashboard.html');
const html = fs.readFileSync(file, 'utf8');

assert.match(html, /\/api\/seller\/profile/);
assert.match(html, /\/api\/seller\/earnings/);
assert.match(html, /\/api\/seller\/payouts/);
assert.match(html, /submit-verification/);
assert.match(html, /credentials:'same-origin'/);
assert.match(html, /r\.status===401\|\|r\.status===403/);
assert.match(html, /Seller sign-in or seller permissions are required/);
assert.match(html, /Products/);
assert.match(html, /Storefront/);

console.log('Seller dashboard static contract checks passed.');
