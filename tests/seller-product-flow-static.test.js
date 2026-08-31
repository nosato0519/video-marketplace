import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const products = fs.readFileSync(path.join(root, 'seller', 'products.html'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'seller', 'product-editor.html'), 'utf8');

assert.match(products, /\/api\/seller\/products/);
assert.match(products, /\/seller\/product-editor\.html/);
assert.match(products, /publish/);
assert.match(products, /unpublish/);
assert.match(products, /credentials:\s*['"]same-origin['"]/);
assert.match(editor, /\/api\/seller\/products/);
assert.match(editor, /\/api\/seller\/media\/upload/);
assert.match(editor, /\/publish/);
assert.match(editor, /mediaAssetId/);
assert.match(editor, /Private media credentials are never exposed/);
assert.match(editor, /Server-side validation/);
assert.match(editor, /5\*1024\*1024\*1024/);
assert.match(editor, /credentials:\s*['"]same-origin['"]/);
assert.match(editor, /headers:\{\s*['"]Content-Type['"]:\s*f\.type\s*,\s*['"]X-Original-Filename['"]:\s*f\.name\s*\}/);
assert.match(editor, /body:\s*f/);
console.log('Seller product publishing flow static contract checks passed.');
