import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const file = path.resolve(__dirname, '..', 'seller', 'dashboard.html');
const html = fs.readFileSync(file, 'utf8');

assert.match(html, /\/api\/seller\/profile/);
assert.match(html, /\/api\/seller\/earnings/);
assert.match(html, /href="\/seller\/withdrawal\.html"/);
assert.match(html, /id="seller-verification-card"/);
assert.match(html, /credentials: 'same-origin'/);
assert.match(html, /error\.status === 401/);
assert.match(html, /href="\/seller\/products\.html"/);
assert.match(html, /href="\/seller\/creator\.html"/);
console.log('Seller dashboard static contract checks passed.');
