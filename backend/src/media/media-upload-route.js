import express from 'express';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { mediaSignatureMatches, requiredSignatureBytes } from './media-upload-validation.js';
import { createConfiguredMediaStorage } from './media-storage-factory.js';

const router = express.Router();
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024 * 1024;
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
const configuredMaxBytes = Number(process.env.MEDIA_MAX_UPLOAD_BYTES);
const MAX_BYTES = Number.isSafeInteger(configuredMaxBytes) && configuredMaxBytes > 0 ? configuredMaxBytes : DEFAULT_MAX_BYTES;
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED_MIME = new Set([...ALLOWED_VIDEO_MIME, ...ALLOWED_IMAGE_MIME]);
const mediaStorage = createConfiguredMediaStorage();

function safeExtension(mime) {
  return {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/quicktime': '.mov',
    'video/x-matroska': '.mkv',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }[mime];
}

function safeOriginalFilename(value) {
  const normalized = String(value || 'video').replace(/[\u0000-\u001f\u007f]/g, '_').trim();
  return (normalized || 'video').slice(0, 512);
}

router.use(requireAuth, requireRole('seller'));

router.get('/limits', (req, res) => res.json({ maxUploadBytes: MAX_BYTES, maxImageUploadBytes: MAX_IMAGE_BYTES }));

router.get('/assets', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT
         media_assets.id,
         media_assets.original_filename,
         media_assets.mime_type,
         media_assets.byte_size,
         media_assets.status,
         media_assets.created_at,
         EXISTS (
           SELECT 1
           FROM products
           WHERE products.media_asset_id = media_assets.id
         ) OR EXISTS (
           SELECT 1
           FROM product_images
           WHERE product_images.media_asset_id = media_assets.id
         ) AS in_use
       FROM media_assets
       WHERE media_assets.owner_user_id = $1
       ORDER BY media_assets.created_at DESC`,
      [req.user.id]
    );
    return res.json({ mediaAssets: result.rows });
  } catch (error) { return next(error); }
});

router.delete('/assets/:assetId', async (req, res, next) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(req.params.assetId)) {
    return res.status(404).json({ error: 'media_asset_not_found' });
  }

  try {
    const deletion = await withTransaction(async (client) => {
      const result = await client.query(
        'SELECT id, storage_key, status FROM media_assets WHERE id = $1 AND owner_user_id = $2 FOR UPDATE',
        [req.params.assetId, req.user.id]
      );
      if (!result.rows.length) return { notFound: true };

      const asset = result.rows[0];
      if (asset.status !== 'deleted') {
        const linked = await client.query('SELECT id FROM products WHERE media_asset_id = $1 UNION ALL SELECT id FROM product_images WHERE media_asset_id = $1 LIMIT 1', [asset.id]);
        if (linked.rows.length) return { inUse: true };

        await client.query(
          "UPDATE media_assets SET status = 'deleted' WHERE id = $1 AND owner_user_id = $2",
          [asset.id, req.user.id]
        );
      }

      return { asset };
    });

    if (deletion.notFound) return res.status(404).json({ error: 'media_asset_not_found' });
    if (deletion.inUse) return res.status(409).json({ error: 'media_asset_in_use' });

    // Keep the tombstone until storage deletion succeeds; retries can safely finish cleanup.
    await mediaStorage.deleteObject({ storageKey: deletion.asset.storage_key });
    await query(
      "DELETE FROM media_assets WHERE id = $1 AND owner_user_id = $2 AND status = 'deleted'",
      [deletion.asset.id, req.user.id]
    );
    return res.status(204).end();
  } catch (error) { return next(error); }
});

router.post('/upload', async (req, res, next) => {
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const filename = safeOriginalFilename(req.headers['x-original-filename']);
  const rawLength = req.headers['content-length'];
  const declaredLength = rawLength == null ? null : Number(rawLength);

  if (!ALLOWED_MIME.has(mime)) return res.status(415).json({ error: 'unsupported_media_type' });
  const maxBytes = ALLOWED_IMAGE_MIME.has(mime) ? MAX_IMAGE_BYTES : MAX_BYTES;
  if (declaredLength !== null && (!Number.isSafeInteger(declaredLength) || declaredLength < 0)) {
    return res.status(400).json({ error: 'invalid_content_length' });
  }
  if (declaredLength === 0) return res.status(400).json({ error: 'empty_upload_body' });
  if (declaredLength !== null && declaredLength > maxBytes) return res.status(413).json({ error: 'media_too_large' });
  if (!req.readable) return res.status(400).json({ error: 'upload_body_required' });

  const id = crypto.randomUUID();
  const storageKey = `${req.user.id}/${id}${safeExtension(mime)}`;
  let bytes = 0;
  const limiter = async function* () {
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > maxBytes) throw Object.assign(new Error('media_too_large'), { statusCode: 413 });
      yield chunk;
    }
  };

  try {
    await mediaStorage.putStream({ storageKey, stream: Readable.from(limiter()), contentLength: declaredLength });

    if (bytes === 0) {
      throw Object.assign(new Error('empty_upload_body'), { statusCode: 400 });
    }
    if (declaredLength !== null && bytes !== declaredLength) {
      throw Object.assign(new Error('content_length_mismatch'), { statusCode: 400 });
    }

    const signatureLength = requiredSignatureBytes(mime);
    const inspected = await mediaStorage.getStream({ storageKey, range: { start: 0, end: signatureLength - 1 } });
    const chunks = [];
    for await (const chunk of inspected.stream) chunks.push(chunk);
    const signature = Buffer.concat(chunks);
    if (signature.length !== signatureLength || !mediaSignatureMatches(mime, signature)) {
      throw Object.assign(new Error('invalid_media_signature'), { statusCode: 415 });
    }

    const result = await query(
      `INSERT INTO media_assets (id, owner_user_id, storage_key, original_filename, mime_type, byte_size, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'ready')
       RETURNING id, original_filename, mime_type, byte_size, status, created_at`,
      [id, req.user.id, storageKey, filename, mime, bytes]
    );
    return res.status(201).json({ mediaAsset: result.rows[0] });
  } catch (error) {
    try {
      await mediaStorage.deleteObject({ storageKey });
    } catch (cleanupError) {
      console.error('media_upload_cleanup_failed', cleanupError);
      try {
        // Keep a retryable tombstone when storage cleanup fails after a partial upload.
        await query(
          `INSERT INTO media_assets (id, owner_user_id, storage_key, original_filename, mime_type, byte_size, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'deleted')
           ON CONFLICT (id) DO UPDATE SET status = 'deleted'
           WHERE media_assets.owner_user_id = EXCLUDED.owner_user_id
             AND media_assets.storage_key = EXCLUDED.storage_key`,
          [id, req.user.id, storageKey, filename, mime, bytes]
        );
      } catch (recordError) {
        console.error('media_upload_orphan_record_failed', recordError);
      }
    }
    return next(error);
  }
});

export default router;
