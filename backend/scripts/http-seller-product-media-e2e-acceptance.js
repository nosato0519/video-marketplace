import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { createSessionToken, hashSessionToken, sessionExpiry } from '../src/auth/session.js';

process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';

const pool = getPool();
const server = createServer(createApp());
const mediaRoot = process.env.MEDIA_STORAGE_DIR;
const uploadBytes = Buffer.from('seller-e2e-video-fixture');
const ids = { seller: crypto.randomUUID(), otherSeller: crypto.randomUUID(), media: null, product: null };
const sellerToken = createSessionToken();
const otherSellerToken = createSessionToken();

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

const sellerCookie = `video_marketplace_session=${encodeURIComponent(sellerToken)}`;
const otherSellerCookie = `video_marketplace_session=${encodeURIComponent(otherSellerToken)}`;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status) VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'seller', 'active')`, [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.otherSeller, `other-seller-${ids.otherSeller}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name) VALUES ($1, 'Seller E2E'), ($2, 'Other Seller E2E')`, [ids.seller, ids.otherSeller]);
  await pool.query(`INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3), ($4, $5, $6)`, [ids.seller, hashSessionToken(sellerToken), sessionExpiry(), ids.otherSeller, hashSessionToken(otherSellerToken), sessionExpiry()]);

  const uploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e.mp4' }, body: uploadBytes });
  assert.equal(uploadResponse.response.status, 201, JSON.stringify(uploadResponse.body));
  assert.equal(uploadResponse.body.mediaAsset.mime_type, 'video/mp4');
  assert.equal(Number(uploadResponse.body.mediaAsset.byte_size), uploadBytes.length);
  ids.media = uploadResponse.body.mediaAsset.id;

  const assetsResponse = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsResponse.response.status, 200, JSON.stringify(assetsResponse.body));
  assert.equal(assetsResponse.body.mediaAssets.some((asset) => asset.id === ids.media), true);
  const otherAssetsResponse = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: otherSellerCookie } });
  assert.equal(otherAssetsResponse.response.status, 200, JSON.stringify(otherAssetsResponse.body));
  assert.equal(otherAssetsResponse.body.mediaAssets.some((asset) => asset.id === ids.media), false);

  const createResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Seller E2E Product', description: 'Seller product/media end-to-end acceptance', priceAmount: 2200, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(createResponse.response.status, 201, JSON.stringify(createResponse.body));
  assert.equal(createResponse.body.product.status, 'draft');
  assert.equal(createResponse.body.product.media_asset_id, ids.media);
  ids.product = createResponse.body.product.id;

  const patchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ description: 'Updated seller E2E product description' }) });
  assert.equal(patchResponse.response.status, 200, JSON.stringify(patchResponse.body));
  assert.equal(patchResponse.body.product.description, 'Updated seller E2E product description');

  const publishResponse = await request(baseUrl, `/api/seller/products/${ids.product}/publish`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(publishResponse.response.status, 200, JSON.stringify(publishResponse.body));
  assert.equal(publishResponse.body.product.status, 'published');

  const listResponse = await request(baseUrl, '/api/seller/products', { headers: { cookie: sellerCookie } });
  assert.equal(listResponse.response.status, 200, JSON.stringify(listResponse.body));
  assert.equal(listResponse.body.products.some((product) => product.id === ids.product && product.status === 'published'), true);
  const detailResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { headers: { cookie: sellerCookie } });
  assert.equal(detailResponse.response.status, 200, JSON.stringify(detailResponse.body));
  assert.equal(detailResponse.body.product.id, ids.product);

  const otherDetailResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { headers: { cookie: otherSellerCookie } });
  assert.equal(otherDetailResponse.response.status, 404, JSON.stringify(otherDetailResponse.body));

  const lockedUpdateResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Should Not Change' }) });
  assert.equal(lockedUpdateResponse.response.status, 409, JSON.stringify(lockedUpdateResponse.body));
  assert.equal(lockedUpdateResponse.body.error, 'published_product_locked');

  console.log('http-seller-product-media-e2e-acceptance: PASS');
} finally {
  if (ids.product) {
    await pool.query(`UPDATE products SET media_asset_id = NULL WHERE id = $1`, [ids.product]).catch(() => {});
    await pool.query(`DELETE FROM products WHERE id = $1`, [ids.product]).catch(() => {});
  }
  if (ids.media) {
    const media = await pool.query(`SELECT storage_key FROM media_assets WHERE id = $1`, [ids.media]).catch(() => ({ rows: [] }));
    await pool.query(`DELETE FROM media_assets WHERE id = $1`, [ids.media]).catch(() => {});
    if (media.rows[0]?.storage_key) await fs.rm(`${mediaRoot}/${media.rows[0].storage_key}`, { force: true }).catch(() => {});
  }
  await pool.query(`DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller]]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller]]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller]]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
