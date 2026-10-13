import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const products = fs.readFileSync(path.join(root, 'seller', 'products.html'), 'utf8');
const productsScript = fs.readFileSync(path.join(root, 'app', 'seller', 'seller-products.js'), 'utf8');
const editor = fs.readFileSync(path.join(root, 'seller', 'product-editor.html'), 'utf8');
const productEdit = fs.readFileSync(path.join(root, 'seller', 'product-edit.html'), 'utf8');
const spaUpload = fs.readFileSync(path.join(root, 'app', 'seller', 'seller-upload.js'), 'utf8');

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
assert.match(editor, /function uploadVideo\(file, onProgress\)/);
assert.match(editor, /function getVideoMime\(file\)/);
assert.match(editor, /mimeByExtension/);
assert.match(editor, /xhr\.setRequestHeader\('Content-Type', getVideoMime\(file\)\)/);
assert.match(editor, /xhr\.setRequestHeader\('X-Original-Filename', file\.name\)/);
assert.match(editor, /xhr\.send\(file\)/);
assert.match(editor, /xhr\.upload\.addEventListener\('progress'/);
assert.match(editor, /5 \* 1024 \* 1024 \* 1024/);
assert.match(editor, /video\/mp4/);
assert.match(editor, /file\.size === 0/);
assert.match(editor, /uploadedMediaAssetId && !productCreated/);


assert.match(productsScript, /product-edit\.html\?productId=/);
assert.match(productsScript, /seller-video-edit/);

assert.match(productEdit, /new URLSearchParams\(window\.location\.search\)\.get\('productId'\)/);
assert.match(productEdit, /\/api\/seller\/products\//);
assert.match(productEdit, /method: 'PATCH'/);
assert.match(productEdit, /\/api\/seller\/media\/upload/);
assert.match(productEdit, /\/api\/seller\/media\/assets\//);
assert.match(productEdit, /method: 'DELETE'/);
assert.match(productEdit, /body\.mediaAssetId = uploadedMediaAssetId/);
assert.match(productEdit, /currentProductStatus === 'published'/);
assert.match(productEdit, /isSaving/);
assert.match(productEdit, /replacementVideo\.size > maxUploadBytes/);
assert.match(productEdit, /function getVideoMime\(file\)/);
assert.match(productEdit, /'Content-Type': getVideoMime\(replacementVideo\)/);
assert.match(spaUpload, /function getVideoMime\(file\)/);
assert.match(spaUpload, /'content-type': getVideoMime\(file\)/);

console.log('Seller product upload flow static contract checks passed.');
