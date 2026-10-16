import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer, request as httpRequest } from 'node:http';
process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
process.env.MEDIA_MAX_UPLOAD_BYTES = '24';

const { getPool } = await import('../src/db.js');
const { createConfiguredMediaStorage } = await import('../src/media/media-storage-factory.js');
const { createApp } = await import('../src/app.js');
const { createSessionToken, hashSessionToken, sessionExpiry } = await import('../src/auth/session.js');

const pool = getPool();
const server = createServer(createApp());
const mediaStorage = createConfiguredMediaStorage();
// Minimal MP4-shaped fixture: the upload validator only needs a valid ISO BMFF
// `ftyp` box signature at byte offset 4; the fixture is not used for playback.
const uploadBytes = Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32]);
const ids = { seller: crypto.randomUUID(), otherSeller: crypto.randomUUID(), buyer: crypto.randomUUID(), admin: crypto.randomUUID(), media: null, otherSellerMedia: null, replacementMedia: null, retryMedia: null, raceMedia: null, raceProduct: null, editPublishRaceProduct: null, optionalVerificationProduct: null, product: null };
const sellerToken = createSessionToken();
const otherSellerToken = createSessionToken();
const adminToken = createSessionToken();

async function localSellerMediaFiles(sellerId) {
  if ((process.env.MEDIA_STORAGE_PROVIDER || 'local') !== 'local') return null;
  const sellerDir = path.join(process.env.MEDIA_STORAGE_DIR, sellerId);
  try {
    return (await fs.readdir(sellerDir)).sort();
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await response.json() : Buffer.from(await response.arrayBuffer());
  return { response, body };
}

async function submitAndApproveProduct(baseUrl, productId, sellerCookie) {
  const submit = await request(baseUrl, `/api/seller/products/${productId}/submit`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(submit.response.status, 200, JSON.stringify(submit.body));
  const review = await pool.query("SELECT id FROM content_reviews WHERE product_id = $1 AND status = 'pending' ORDER BY created_at DESC LIMIT 1", [productId]);
  assert.ok(review.rows[0]?.id, 'Submitting a product must create a pending moderation review');
  const approval = await request(baseUrl, `/api/admin/content/reviews/${review.rows[0].id}/status`, { method: 'POST', headers: { cookie: adminCookie, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'approved' }) });
  assert.equal(approval.response.status, 200, JSON.stringify(approval.body));
  const product = await request(baseUrl, `/api/seller/products/${productId}`, { headers: { cookie: sellerCookie } });
  assert.equal(product.response.status, 200, JSON.stringify(product.body));
  assert.equal(product.body.product.status, 'published');
}

async function requestChunked(baseUrl, path, { headers, body }) {
  const url = new URL(path, baseUrl);
  return new Promise((resolve, reject) => {
    const req = httpRequest(url, { method: 'POST', headers: { ...headers, 'transfer-encoding': 'chunked' } }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        const rawBody = Buffer.concat(chunks);
        let parsedBody = rawBody;
        if ((response.headers['content-type'] || '').includes('application/json')) {
          try { parsedBody = JSON.parse(rawBody.toString('utf8')); } catch {}
        }
        resolve({ response: { status: response.statusCode }, body: parsedBody });
      });
    });
    req.on('error', reject);
    req.end(body);
  });
}

const sellerCookie = `video_marketplace_session=${encodeURIComponent(sellerToken)}`;
const otherSellerCookie = `video_marketplace_session=${encodeURIComponent(otherSellerToken)}`;
const adminCookie = `video_marketplace_session=${encodeURIComponent(adminToken)}`;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  await pool.query(`INSERT INTO users (id, email, email_normalized, role, status) VALUES ($1, $2, $2, 'seller', 'active'), ($3, $4, $4, 'seller', 'active'), ($5, $6, $6, 'buyer', 'active'), ($7, $8, $8, 'admin', 'active')`, [ids.seller, `seller-${ids.seller}@acceptance.test`, ids.otherSeller, `other-seller-${ids.otherSeller}@acceptance.test`, ids.buyer, `buyer-${ids.buyer}@acceptance.test`, ids.admin, `admin-${ids.admin}@acceptance.test`]);
  await pool.query(`INSERT INTO seller_profiles (user_id, display_name, verification_status) VALUES ($1, 'Seller E2E', 'verified'), ($2, 'Other Seller E2E', 'not_started')`, [ids.seller, ids.otherSeller]);
  await pool.query(`INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)`, [ids.seller, hashSessionToken(sellerToken), sessionExpiry(), ids.otherSeller, hashSessionToken(otherSellerToken), sessionExpiry(), ids.admin, hashSessionToken(adminToken), sessionExpiry()]);

  const configuredUploadLimit = await request(baseUrl, '/api/seller/media/limits', { headers: { cookie: sellerCookie } });
  assert.equal(configuredUploadLimit.response.status, 200, JSON.stringify(configuredUploadLimit.body));
  assert.equal(configuredUploadLimit.body.maxUploadBytes, 24, 'Seller upload limit endpoint must expose the configured backend limit');
  const unauthenticatedUploadLimit = await request(baseUrl, '/api/seller/media/limits');
  assert.equal(unauthenticatedUploadLimit.response.status, 401, 'Upload limit endpoint must require seller authentication');

  const assetsBeforeInvalidUpload = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  const filesBeforeInvalidUpload = await localSellerMediaFiles(ids.seller);
  assert.equal(assetsBeforeInvalidUpload.response.status, 200, JSON.stringify(assetsBeforeInvalidUpload.body));
  const emptyUploadResponse = await request(baseUrl, '/api/seller/media/upload', {
    method: 'POST',
    headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': '0', 'x-original-filename': 'empty.mp4' },
    body: Buffer.alloc(0)
  });
  assert.equal(emptyUploadResponse.response.status, 400, JSON.stringify(emptyUploadResponse.body));
  assert.equal(emptyUploadResponse.body.error, 'empty_upload_body');
  const invalidUploadResponse = await request(baseUrl, '/api/seller/media/upload', {
    method: 'POST',
    headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': '8', 'x-original-filename': 'invalid.mp4' },
    body: Buffer.from('notvideo')
  });
  assert.equal(invalidUploadResponse.response.status, 415, JSON.stringify(invalidUploadResponse.body));
  const oversizedUploadResponse = await request(baseUrl, '/api/seller/media/upload', {
    method: 'POST',
    headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': '25', 'x-original-filename': 'oversized.mp4' },
    body: Buffer.alloc(25)
  });
  assert.equal(oversizedUploadResponse.response.status, 413, JSON.stringify(oversizedUploadResponse.body));
  assert.equal(oversizedUploadResponse.body.error, 'media_too_large');

  // Exercise the streaming byte limiter separately from the Content-Length pre-check.
  const chunkedOversizedUploadResponse = await requestChunked(baseUrl, '/api/seller/media/upload', {
    headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'x-original-filename': 'chunked-oversized.mp4' },
    body: Buffer.alloc(25)
  });
  assert.equal(chunkedOversizedUploadResponse.response.status, 413, JSON.stringify(chunkedOversizedUploadResponse.body));
  assert.equal(chunkedOversizedUploadResponse.body.error, 'media_too_large');

  const assetsAfterInvalidUpload = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsAfterInvalidUpload.response.status, 200, JSON.stringify(assetsAfterInvalidUpload.body));
  assert.deepEqual(
    assetsAfterInvalidUpload.body.mediaAssets.map((asset) => asset.id).sort(),
    assetsBeforeInvalidUpload.body.mediaAssets.map((asset) => asset.id).sort(),
    'Invalid video uploads must not create media asset records'
  );
  if (filesBeforeInvalidUpload !== null) {
    assert.deepEqual(await localSellerMediaFiles(ids.seller), filesBeforeInvalidUpload, 'Rejected uploads must not leave partial local media files');
  }

  const uploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e.mp4' }, body: uploadBytes });
  assert.equal(uploadResponse.response.status, 201, JSON.stringify(uploadResponse.body));
  assert.equal(uploadResponse.body.mediaAsset.mime_type, 'video/mp4');
  assert.equal(Number(uploadResponse.body.mediaAsset.byte_size), uploadBytes.length);
  ids.media = uploadResponse.body.mediaAsset.id;

  const assetsResponse = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsResponse.response.status, 200, JSON.stringify(assetsResponse.body));
  assert.equal(assetsResponse.body.mediaAssets.some((asset) => asset.id === ids.media), true);
  const otherSellerUploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: otherSellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'other-seller-e2e.mp4' }, body: uploadBytes });
  assert.equal(otherSellerUploadResponse.response.status, 201, JSON.stringify(otherSellerUploadResponse.body));
  ids.otherSellerMedia = otherSellerUploadResponse.body.mediaAsset.id;

  const unverifiedSellerDraftResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: otherSellerCookie }, body: JSON.stringify({ title: 'Optional Verification Product', description: 'Publishing should not require identity verification when the setting is none.', priceAmount: 1200, priceCurrency: 'JPY', mediaAssetId: ids.otherSellerMedia }) });
  assert.equal(unverifiedSellerDraftResponse.response.status, 201, JSON.stringify(unverifiedSellerDraftResponse.body));
  ids.optionalVerificationProduct = unverifiedSellerDraftResponse.body.product.id;
  await submitAndApproveProduct(baseUrl, ids.optionalVerificationProduct, otherSellerCookie);
  const unverifiedSellerPublishResponse = await request(baseUrl, `/api/seller/products/${unverifiedSellerDraftResponse.body.product.id}/publish`, { method: 'POST', headers: { cookie: otherSellerCookie } });
  assert.equal(unverifiedSellerPublishResponse.response.status, 200, JSON.stringify(unverifiedSellerPublishResponse.body));
  assert.equal(unverifiedSellerPublishResponse.body.product.status, 'published');

  // Race product creation against deletion of the same unused media asset.
  // Exactly one operation may win: creation links the asset, or deletion removes it.
  const raceUploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e-race.mp4' }, body: uploadBytes });
  assert.equal(raceUploadResponse.response.status, 201, JSON.stringify(raceUploadResponse.body));
  ids.raceMedia = raceUploadResponse.body.mediaAsset.id;
  const [raceCreateResponse, raceDeleteResponse] = await Promise.all([
    request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Concurrent Media Product', description: 'Media deletion race acceptance', priceAmount: 2300, priceCurrency: 'JPY', mediaAssetId: ids.raceMedia }) }),
    request(baseUrl, `/api/seller/media/assets/${ids.raceMedia}`, { method: 'DELETE', headers: { cookie: sellerCookie } })
  ]);
  if (raceCreateResponse.response.status === 201) ids.raceProduct = raceCreateResponse.body.product.id;
  assert.ok([201, 422].includes(raceCreateResponse.response.status), JSON.stringify(raceCreateResponse.body));
  assert.ok([204, 409].includes(raceDeleteResponse.response.status), JSON.stringify(raceDeleteResponse.body));
  assert.equal(
    (raceCreateResponse.response.status === 201 && raceDeleteResponse.response.status === 409)
      || (raceCreateResponse.response.status === 422 && raceDeleteResponse.response.status === 204),
    true,
    `Concurrent media create/delete must have one consistent winner; create=${raceCreateResponse.response.status}, delete=${raceDeleteResponse.response.status}`
  );
  if (raceCreateResponse.response.status !== 201) ids.raceMedia = null;

  const otherAssetsResponse = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: otherSellerCookie } });
  assert.equal(otherAssetsResponse.response.status, 200, JSON.stringify(otherAssetsResponse.body));
  assert.equal(otherAssetsResponse.body.mediaAssets.some((asset) => asset.id === ids.media), false);

  const malformedMediaDeleteResponse = await request(baseUrl, '/api/seller/media/assets/not-a-uuid', { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(malformedMediaDeleteResponse.response.status, 404, JSON.stringify(malformedMediaDeleteResponse.body));
  assert.equal(malformedMediaDeleteResponse.body.error, 'media_asset_not_found');

  const otherSellerDeleteResponse = await request(baseUrl, `/api/seller/media/assets/${ids.media}`, { method: 'DELETE', headers: { cookie: otherSellerCookie } });
  assert.equal(otherSellerDeleteResponse.response.status, 404, JSON.stringify(otherSellerDeleteResponse.body));
  const assetAfterUnauthorizedDelete = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetAfterUnauthorizedDelete.body.mediaAssets.some((asset) => asset.id === ids.media), true);

  const malformedMediaResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Malformed Media Product', priceAmount: 2200, priceCurrency: 'JPY', mediaAssetId: 'not-a-uuid' }) });
  assert.equal(malformedMediaResponse.response.status, 422, JSON.stringify(malformedMediaResponse.body));
  assert.equal(malformedMediaResponse.body.error, 'media_asset_not_owned');

  const missingMediaProductResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Missing Media Product', priceAmount: 2200, priceCurrency: 'JPY' }) });
  assert.equal(missingMediaProductResponse.response.status, 422, JSON.stringify(missingMediaProductResponse.body));
  assert.equal(missingMediaProductResponse.body.error, 'media_asset_required');

  const invalidPriceProductResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Invalid Price Product', priceAmount: 0, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(invalidPriceProductResponse.response.status, 422, JSON.stringify(invalidPriceProductResponse.body));
  assert.equal(invalidPriceProductResponse.body.error, 'invalid_product_price');
  const invalidCurrencyProductResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Invalid Currency Product', priceAmount: 2200, priceCurrency: 'JP', mediaAssetId: ids.media }) });
  assert.equal(invalidCurrencyProductResponse.response.status, 422, JSON.stringify(invalidCurrencyProductResponse.body));
  assert.equal(invalidCurrencyProductResponse.body.error, 'invalid_product_currency');

  await pool.query(`UPDATE media_assets SET status = 'processing' WHERE id = $1`, [ids.media]);
  const processingMediaProductResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Processing Media Product', priceAmount: 2200, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(processingMediaProductResponse.response.status, 422, JSON.stringify(processingMediaProductResponse.body));
  assert.equal(processingMediaProductResponse.body.error, 'media_asset_not_ready');
  await pool.query(`UPDATE media_assets SET status = 'ready' WHERE id = $1`, [ids.media]);

  const createResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Seller E2E Product', description: 'Seller product/media end-to-end acceptance', priceAmount: 2200, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(createResponse.response.status, 201, JSON.stringify(createResponse.body));
  assert.equal(createResponse.body.product.status, 'draft');
  assert.equal(createResponse.body.product.media_asset_id, ids.media);
  ids.product = createResponse.body.product.id;

  await pool.query(`INSERT INTO orders (buyer_id, product_id, amount, currency, status) VALUES ($1, $2, 2200, 'JPY', 'pending')`, [ids.buyer, ids.product]);
  const productWithOrderDeleteResponse = await request(baseUrl, '/api/seller/products/' + ids.product, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(productWithOrderDeleteResponse.response.status, 409, JSON.stringify(productWithOrderDeleteResponse.body));
  assert.equal(productWithOrderDeleteResponse.body.error, 'product_has_purchase_history');
  await pool.query(`DELETE FROM orders WHERE product_id = $1`, [ids.product]);

  const deletableProductResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Seller E2E Deletable Draft', description: 'Draft deletion acceptance', priceAmount: 2200, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(deletableProductResponse.response.status, 201, JSON.stringify(deletableProductResponse.body));
  const deletableProductId = deletableProductResponse.body.product.id;
  const otherSellerProductDeleteResponse = await request(baseUrl, '/api/seller/products/' + deletableProductId, { method: 'DELETE', headers: { cookie: otherSellerCookie } });
  assert.equal(otherSellerProductDeleteResponse.response.status, 404, JSON.stringify(otherSellerProductDeleteResponse.body));
  const draftDeleteResponse = await request(baseUrl, '/api/seller/products/' + deletableProductId, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(draftDeleteResponse.response.status, 204, JSON.stringify(draftDeleteResponse.body));
  const deletedDraftDetailResponse = await request(baseUrl, '/api/seller/products/' + deletableProductId, { headers: { cookie: sellerCookie } });
  assert.equal(deletedDraftDetailResponse.response.status, 404, JSON.stringify(deletedDraftDetailResponse.body));

  const linkedMediaDeleteResponse = await request(baseUrl, `/api/seller/media/assets/${ids.media}`, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(linkedMediaDeleteResponse.response.status, 409, JSON.stringify(linkedMediaDeleteResponse.body));
  assert.equal(linkedMediaDeleteResponse.body.error, 'media_asset_in_use');
  const assetAfterLinkedDelete = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetAfterLinkedDelete.response.status, 200, JSON.stringify(assetAfterLinkedDelete.body));
  assert.equal(assetAfterLinkedDelete.body.mediaAssets.find((asset) => asset.id === ids.media)?.in_use, true, 'A linked video must be marked as in use');
  assert.equal(
    assetAfterLinkedDelete.body.mediaAssets.some((asset) => asset.id === ids.media && asset.status === 'ready'),
    true,
    'A linked video must remain available when deletion is rejected'
  );

  const patchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ description: 'Updated seller E2E product description' }) });
  assert.equal(patchResponse.response.status, 200, JSON.stringify(patchResponse.body));
  assert.equal(patchResponse.body.product.description, 'Updated seller E2E product description');

  const emptyTitlePatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: '   ' }) });
  assert.equal(emptyTitlePatchResponse.response.status, 422, JSON.stringify(emptyTitlePatchResponse.body));
  assert.equal(emptyTitlePatchResponse.body.error, 'product_title_required');

  const invalidPricePatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ priceAmount: 0 }) });
  assert.equal(invalidPricePatchResponse.response.status, 422, JSON.stringify(invalidPricePatchResponse.body));
  assert.equal(invalidPricePatchResponse.body.error, 'invalid_product_price');
  const invalidCurrencyPatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ priceCurrency: 'JPY!' }) });
  assert.equal(invalidCurrencyPatchResponse.response.status, 422, JSON.stringify(invalidCurrencyPatchResponse.body));
  assert.equal(invalidCurrencyPatchResponse.body.error, 'invalid_product_currency');

  const detachMediaPatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ mediaAssetId: null }) });
  assert.equal(detachMediaPatchResponse.response.status, 200, JSON.stringify(detachMediaPatchResponse.body));
  assert.equal(detachMediaPatchResponse.body.product.media_asset_id, null);
  const reattachMediaPatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ mediaAssetId: ids.media }) });
  assert.equal(reattachMediaPatchResponse.response.status, 200, JSON.stringify(reattachMediaPatchResponse.body));
  assert.equal(reattachMediaPatchResponse.body.product.media_asset_id, ids.media);

  const otherSellerMediaPatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ mediaAssetId: ids.otherSellerMedia }) });
  assert.equal(otherSellerMediaPatchResponse.response.status, 422, JSON.stringify(otherSellerMediaPatchResponse.body));
  assert.equal(otherSellerMediaPatchResponse.body.error, 'media_asset_not_owned');

  // Race an edit against publishing; editing must either finish before publish or be rejected after publish.
  const editPublishRaceCreateResponse = await request(baseUrl, '/api/seller/products', { method: 'POST', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Edit Publish Race Product', description: 'Concurrent edit/publish acceptance', priceAmount: 2250, priceCurrency: 'JPY', mediaAssetId: ids.media }) });
  assert.equal(editPublishRaceCreateResponse.response.status, 201, JSON.stringify(editPublishRaceCreateResponse.body));
  ids.editPublishRaceProduct = editPublishRaceCreateResponse.body.product.id;
  await submitAndApproveProduct(baseUrl, ids.editPublishRaceProduct, sellerCookie);
  const [racePatchResponse, racePublishResponse] = await Promise.all([
    request(baseUrl, `/api/seller/products/${ids.editPublishRaceProduct}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Edited Before Publish' }) }),
    request(baseUrl, `/api/seller/products/${ids.editPublishRaceProduct}/publish`, { method: 'POST', headers: { cookie: sellerCookie } })
  ]);
  assert.ok([200, 409].includes(racePatchResponse.response.status), JSON.stringify(racePatchResponse.body));
  assert.ok([200, 409].includes(racePublishResponse.response.status), JSON.stringify(racePublishResponse.body));
  const raceProductAfterPublish = await request(baseUrl, `/api/seller/products/${ids.editPublishRaceProduct}`, { headers: { cookie: sellerCookie } });
  assert.equal(raceProductAfterPublish.response.status, 200, JSON.stringify(raceProductAfterPublish.body));
  if (racePublishResponse.response.status === 200) {
    assert.equal(racePublishResponse.body.product.status, 'published');
    assert.equal(raceProductAfterPublish.body.product.status, 'published');
    assert.equal(racePatchResponse.response.status, 409, 'Publishing first must prevent a concurrent edit');
    assert.equal(racePatchResponse.body.error, 'published_product_locked');
  } else {
    assert.equal(racePublishResponse.body.error, 'product_status_not_publishable');
    assert.equal(racePatchResponse.response.status, 200, 'An edit that wins the race must invalidate the previous approval');
    assert.equal(racePatchResponse.body.product.title, 'Edited Before Publish');
    assert.equal(raceProductAfterPublish.body.product.status, 'draft');
  }

  await submitAndApproveProduct(baseUrl, ids.product, sellerCookie);
  const publishResponse = await request(baseUrl, `/api/seller/products/${ids.product}/publish`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(publishResponse.response.status, 200, JSON.stringify(publishResponse.body));
  assert.equal(publishResponse.body.product.status, 'published');
  const publishedProductDeleteResponse = await request(baseUrl, '/api/seller/products/' + ids.product, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(publishedProductDeleteResponse.response.status, 409, JSON.stringify(publishedProductDeleteResponse.body));
  assert.equal(publishedProductDeleteResponse.body.error, 'published_product_locked');

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

  const unpublishResponse = await request(baseUrl, `/api/seller/products/${ids.product}/unpublish`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(unpublishResponse.response.status, 200, JSON.stringify(unpublishResponse.body));
  assert.equal(unpublishResponse.body.product.status, 'approved');

  await pool.query(`UPDATE media_assets SET status = 'processing' WHERE id = $1`, [ids.media]);
  const processingMediaPublishResponse = await request(baseUrl, `/api/seller/products/${ids.product}/publish`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(processingMediaPublishResponse.response.status, 422, JSON.stringify(processingMediaPublishResponse.body));
  assert.equal(processingMediaPublishResponse.body.error, 'product_not_publishable');
  await pool.query(`UPDATE media_assets SET status = 'ready' WHERE id = $1`, [ids.media]);

  const replacementUploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e-replacement.mp4' }, body: uploadBytes });
  assert.equal(replacementUploadResponse.response.status, 201, JSON.stringify(replacementUploadResponse.body));
  ids.replacementMedia = replacementUploadResponse.body.mediaAsset.id;

  await pool.query(`UPDATE media_assets SET status = 'processing' WHERE id = $1`, [ids.replacementMedia]);
  const processingMediaPatchResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ mediaAssetId: ids.replacementMedia }) });
  assert.equal(processingMediaPatchResponse.response.status, 422, JSON.stringify(processingMediaPatchResponse.body));
  assert.equal(processingMediaPatchResponse.body.error, 'media_asset_not_ready');
  await pool.query(`UPDATE media_assets SET status = 'ready' WHERE id = $1`, [ids.replacementMedia]);

  const malformedProductEditResponse = await request(baseUrl, '/api/seller/products/not-a-uuid', { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ title: 'Malformed Product ID' }) });
  assert.equal(malformedProductEditResponse.response.status, 404, JSON.stringify(malformedProductEditResponse.body));
  assert.equal(malformedProductEditResponse.body.error, 'product_not_found');

  const malformedProductGetResponse = await request(baseUrl, '/api/seller/products/not-a-uuid', { headers: { cookie: sellerCookie } });
  assert.equal(malformedProductGetResponse.response.status, 404, JSON.stringify(malformedProductGetResponse.body));
  assert.equal(malformedProductGetResponse.body.error, 'product_not_found');
  const malformedProductPublishResponse = await request(baseUrl, '/api/seller/products/not-a-uuid/publish', { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(malformedProductPublishResponse.response.status, 404, JSON.stringify(malformedProductPublishResponse.body));
  assert.equal(malformedProductPublishResponse.body.error, 'product_not_found');
  const malformedProductUnpublishResponse = await request(baseUrl, '/api/seller/products/not-a-uuid/unpublish', { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(malformedProductUnpublishResponse.response.status, 404, JSON.stringify(malformedProductUnpublishResponse.body));
  assert.equal(malformedProductUnpublishResponse.body.error, 'published_product_not_found');

  const replaceMediaResponse = await request(baseUrl, `/api/seller/products/${ids.product}`, { method: 'PATCH', headers: { 'content-type': 'application/json', cookie: sellerCookie }, body: JSON.stringify({ mediaAssetId: ids.replacementMedia }) });
  assert.equal(replaceMediaResponse.response.status, 200, JSON.stringify(replaceMediaResponse.body));
  assert.equal(replaceMediaResponse.body.product.media_asset_id, ids.replacementMedia);

  const unusedUploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e-unused.mp4' }, body: uploadBytes });
  assert.equal(unusedUploadResponse.response.status, 201, JSON.stringify(unusedUploadResponse.body));
  const unusedMediaId = unusedUploadResponse.body.mediaAsset.id;
  const assetsBeforeUnusedDelete = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsBeforeUnusedDelete.response.status, 200, JSON.stringify(assetsBeforeUnusedDelete.body));
  assert.equal(assetsBeforeUnusedDelete.body.mediaAssets.find((asset) => asset.id === unusedMediaId)?.in_use, false, 'An unlinked video must be marked as unused');
  const localFilesBeforeUnusedDelete = await localSellerMediaFiles(ids.seller);
  const deleteUnusedMediaResponse = await request(baseUrl, `/api/seller/media/assets/${unusedMediaId}`, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(deleteUnusedMediaResponse.response.status, 204, JSON.stringify(deleteUnusedMediaResponse.body));
  const assetsAfterUnusedDelete = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsAfterUnusedDelete.body.mediaAssets.some((asset) => asset.id === unusedMediaId), false);
  if (localFilesBeforeUnusedDelete !== null) {
    assert.equal((await localSellerMediaFiles(ids.seller)).length, localFilesBeforeUnusedDelete.length - 1, 'Deleting unused media must remove its stored file');
  }

  const retryUploadResponse = await request(baseUrl, '/api/seller/media/upload', { method: 'POST', headers: { cookie: sellerCookie, 'content-type': 'video/mp4', 'content-length': String(uploadBytes.length), 'x-original-filename': 'seller-e2e-delete-retry.mp4' }, body: uploadBytes });
  assert.equal(retryUploadResponse.response.status, 201, JSON.stringify(retryUploadResponse.body));
  ids.retryMedia = retryUploadResponse.body.mediaAsset.id;
  await pool.query(`UPDATE media_assets SET status = 'deleted' WHERE id = $1 AND owner_user_id = $2`, [ids.retryMedia, ids.seller]);
  const pendingDeletionAssets = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(pendingDeletionAssets.body.mediaAssets.find((asset) => asset.id === ids.retryMedia)?.status, 'deleted', 'Failed cleanup tombstones must remain visible for retry');
  const retryDeleteResponse = await request(baseUrl, `/api/seller/media/assets/${ids.retryMedia}`, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(retryDeleteResponse.response.status, 204, JSON.stringify(retryDeleteResponse.body));
  const assetsAfterRetryDelete = await request(baseUrl, '/api/seller/media/assets', { headers: { cookie: sellerCookie } });
  assert.equal(assetsAfterRetryDelete.body.mediaAssets.some((asset) => asset.id === ids.retryMedia), false, 'Retrying tombstone cleanup must remove the asset record');

  const filesBeforeLinkedDelete = await localSellerMediaFiles(ids.seller);
  const linkedReplacementDeleteResponse = await request(baseUrl, `/api/seller/media/assets/${ids.replacementMedia}`, { method: 'DELETE', headers: { cookie: sellerCookie } });
  assert.equal(linkedReplacementDeleteResponse.response.status, 409, JSON.stringify(linkedReplacementDeleteResponse.body));
  assert.equal(linkedReplacementDeleteResponse.body.error, 'media_asset_in_use');
  if (filesBeforeLinkedDelete !== null) {
    assert.deepEqual(await localSellerMediaFiles(ids.seller), filesBeforeLinkedDelete, 'Rejecting deletion of linked media must preserve its stored file');
  }

  await submitAndApproveProduct(baseUrl, ids.product, sellerCookie);
  const republishResponse = await request(baseUrl, `/api/seller/products/${ids.product}/publish`, { method: 'POST', headers: { cookie: sellerCookie } });
  assert.equal(republishResponse.response.status, 200, JSON.stringify(republishResponse.body));
  assert.equal(republishResponse.body.product.status, 'published');

  console.log('http-seller-product-media-e2e-acceptance: PASS');
} finally {
  if (ids.product) await pool.query(`DELETE FROM orders WHERE product_id = $1`, [ids.product]).catch(() => {});
  for (const productId of [ids.product, ids.raceProduct, ids.editPublishRaceProduct, ids.optionalVerificationProduct].filter(Boolean)) {
    await pool.query(`UPDATE products SET media_asset_id = NULL WHERE id = $1`, [productId]).catch(() => {});
    await pool.query(`DELETE FROM products WHERE id = $1`, [productId]).catch(() => {});
  }
  for (const mediaId of [ids.media, ids.otherSellerMedia, ids.replacementMedia, ids.retryMedia, ids.raceMedia].filter(Boolean)) {
    const media = await pool.query(`SELECT storage_key FROM media_assets WHERE id = $1`, [mediaId]).catch(() => ({ rows: [] }));
    await pool.query(`DELETE FROM media_assets WHERE id = $1`, [mediaId]).catch(() => {});
    if (media.rows[0]?.storage_key) await mediaStorage.deleteObject({ storageKey: media.rows[0].storage_key }).catch(() => {});
  }
  await pool.query(`DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller]]).catch(() => {});
  await pool.query(`DELETE FROM seller_profiles WHERE user_id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller]]).catch(() => {});
  await pool.query(`DELETE FROM users WHERE id = ANY($1::uuid[])`, [[ids.seller, ids.otherSeller, ids.buyer, ids.admin]]).catch(() => {});
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
}
