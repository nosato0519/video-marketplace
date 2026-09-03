import express from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { Readable } from 'node:stream';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { mediaSignatureMatches, requiredSignatureBytes } from './media-upload-validation.js';
import { createConfiguredMediaStorage } from './media-storage-factory.js';

const router = express.Router();
const MAX_BYTES = Number(process.env.MEDIA_MAX_UPLOAD_BYTES || 5 * 1024 * 1024 * 1024);
const ALLOWED_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
const mediaStorage = createConfiguredMediaStorage();

function safeExtension(filename, mime) {
  const ext = filename ? filename.toLowerCase().match(/\.[a-z0-9]{1,8}$/)?.[0] : null;
  if (ext) return ext;
  return mime === 'video/webm' ? '.webm' : mime === 'video/quicktime' ? '.mov' : mime === 'video/x-matroska' ? '.mkv' : '.mp4';
}

router.use(requireAuth, requireRole('seller'));

router.get('/assets', async (req, res, next) => {
  try {
    const result = await query(`SELECT id, original_filename, mime_type, byte_size, status, created_at FROM media_assets WHERE owner_user_id = $1 ORDER BY created_at DESC`, [req.user.id]);
    return res.json({ mediaAssets: result.rows });
  } catch (error) { return next(error); }
});

router.post('/upload', async (req, res, next) => {
  const mime = String(req.headers['content-type'] || '').split(';')[0].toLowerCase();
  const filename = String(req.headers['x-original-filename'] || 'video');
  const declaredLength = Number(req.headers['content-length'] || 0);
  if (!ALLOWED_MIME.has(mime)) return res.status(415).json({ error: 'unsupported_media_type' });
  if (declaredLength > MAX_BYTES) return res.status(413).json({ error: 'media_too_large' });
  if (!req.readable) return res.status(400).json({ error: 'upload_body_required' });

  const id = crypto.randomUUID();
  const storageKey = `${req.user.id}/${id}${safeExtension(filename, mime)}`;
  let bytes = 0;
  const limiter = async function* () {
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BYTES) throw Object.assign(new Error('media_too_large'), { statusCode: 413 });
      yield chunk;
    }
  };

  try {
    await mediaStorage.putStream({ storageKey, stream: Readable.from(limiter()) });

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
      [id, req.user.id, storageKey, filename.slice(0, 512), mime, bytes]
    );
    return res.status(201).json({ mediaAsset: result.rows[0] });
  } catch (error) {
    await mediaStorage.deleteObject({ storageKey }).catch(() => {});
    return next(error);
  }
});

export default router;
