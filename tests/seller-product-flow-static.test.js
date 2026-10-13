import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const products = fs.readFileSync(path.join(root, 'seller', 'products.html'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'seller', 'product-editor.html'), 'utf8');

assert.match(products, /href="\/seller\/product-editor\.html"/);
assert.match(products, /id="seller-product-list"/);
assert.match(products, /class="seller-pagination"/);
assert.match(products, /src="\/app\/seller\/seller-products\.js"/);

assert.match(editor, /\/api\/auth\/me/);
assert.match(editor, /session\.user\?\.role !== 'seller'/);
assert.match(editor, /\/api\/seller\/media\/upload/);
assert.match(editor, /\/api\/seller\/products/);
assert.match(editor, /\/api\/seller\/media\/assets\//);
assert.match(editor, /mediaAssetId/);
assert.match(editor, /credentials: 'same-origin'/);
assert.match(editor, /Content-Type': file\.type/);
assert.match(editor, /X-Original-Filename': file\.name/);
assert.match(editor, /body: file/);
assert.match(editor, /5 \* 1024 \* 1024 \* 1024/);
assert.match(editor, /video\/mp4/);
assert.match(editor, /file\.size === 0/);
assert.match(editor, /uploadedMediaAssetId && !productCreated/);

console.log('Seller product upload flow static contract checks passed.');
