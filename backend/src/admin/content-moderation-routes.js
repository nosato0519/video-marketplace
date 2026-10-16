import express from 'express';
import crypto from 'node:crypto';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { createConfiguredMediaStorage } from '../media/media-storage-factory.js';
import { parseRangeHeader } from '../media/range-request.js';

const router = express.Router();
const mediaStorage = createConfiguredMediaStorage();
router.use(requireAuth, requireRole('admin'));

const reviewTransitions = {
  pending: new Set(['approved', 'rejected', 'changes_requested', 'blocked']),
  changes_requested: new Set(['pending', 'rejected', 'blocked']),
  approved: new Set(['blocked']),
  rejected: new Set(['pending']),
  blocked: new Set(['pending'])
};

const reportTransitions = {
  open: new Set(['reviewing', 'resolved', 'dismissed']),
  reviewing: new Set(['resolved', 'dismissed']),
  resolved: new Set(),
  dismissed: new Set(['reviewing'])
};

async function audit(actorUserId, action, resourceId, metadata = {}) {
  await query(
    `INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, 'content_moderation', $3, $4::jsonb)`,
    [actorUserId, action, resourceId, JSON.stringify(metadata)]
  );
}

router.get('/content/reviews', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const values = [];
    let where = '';
    if (status) { values.push(status); where = 'WHERE r.status = $1'; }
    const result = await query(
      `SELECT r.id, r.product_id, r.reviewer_id, r.status, r.reason_code, r.notes,
              r.created_at, r.resolved_at, p.title AS product_title,
              p.seller_id, u.email AS seller_email, p.status AS product_status,
              p.moderation_status, p.price_amount, p.price_currency,
              m.original_filename AS media_original_filename,
              m.mime_type AS media_mime_type, m.byte_size AS media_byte_size,
              m.status AS media_status
         FROM content_reviews r
         JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = p.seller_id
         LEFT JOIN media_assets m ON m.id = p.media_asset_id
        ${where}
        ORDER BY r.created_at DESC LIMIT 200`, values
    );
    res.json({ reviews: result.rows });
  } catch (error) { next(error); }
});

router.get('/content/reviews/:id', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.id, r.status, r.notes, r.created_at,
              p.id AS product_id, p.title AS product_title, p.description,
              p.price_amount, p.price_currency, p.status AS product_status,
              c.slug AS category_slug, c.name AS category_name, u.email AS seller_email,
              m.original_filename AS media_original_filename,
              m.mime_type AS media_mime_type, m.byte_size AS media_byte_size,
              m.status AS media_status
         FROM content_reviews r JOIN products p ON p.id = r.product_id
         LEFT JOIN categories c ON c.id = p.category_id
         LEFT JOIN users u ON u.id = p.seller_id
         LEFT JOIN media_assets m ON m.id = p.media_asset_id
        WHERE r.id = $1 LIMIT 1`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'review_not_found' });
    return res.json({ review: result.rows[0] });
  } catch (error) { return next(error); }
});

router.get('/content/reviews/:id/video', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.storage_key, m.mime_type, m.byte_size, m.status
         FROM content_reviews r
         JOIN products p ON p.id = r.product_id
         JOIN media_assets m ON m.id = p.media_asset_id
        WHERE r.id = $1`,
      [req.params.id]
    );
    const asset = result.rows[0];
    if (!asset || asset.status !== 'ready' || !String(asset.mime_type || '').startsWith('video/')) {
      return res.status(404).json({ error: 'review_video_not_found' });
    }
    const size = Number(asset.byte_size);
    if (!Number.isSafeInteger(size) || size <= 0) return res.status(500).json({ error: 'media_size_invalid' });
    let range = null;
    if (req.headers.range) {
      range = parseRangeHeader(req.headers.range, size);
      if (!range) {
        res.setHeader('Content-Range', `bytes */${size}`);
        return res.status(416).end();
      }
    }
    const object = await mediaStorage.getStream({
      storageKey: asset.storage_key,
      range: range ? { start: range.start, end: range.end } : undefined,
    });
    if (!object?.stream) return res.status(404).json({ error: 'review_video_not_found' });
    res.setHeader('Content-Type', asset.mime_type);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Accept-Ranges', 'bytes');
    if (range) {
      res.status(206);
      res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
      res.setHeader('Content-Length', String(range.length));
    } else {
      res.setHeader('Content-Length', String(size));
    }
    return object.stream.pipe(res);
  } catch (error) { return next(error); }
});

router.post('/content/reviews/:id/status', async (req, res, next) => {
  try {
    const nextStatus = String(req.body?.status || '').trim();
    if (!Object.hasOwn(reviewTransitions, nextStatus)) return res.status(400).json({ error: 'invalid_status' });
    const current = await query(`SELECT id, product_id, status FROM content_reviews WHERE id = $1`, [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ error: 'review_not_found' });
    const row = current.rows[0];
    if (!reviewTransitions[row.status]?.has(nextStatus)) return res.status(409).json({ error: 'invalid_status_transition', from: row.status, to: nextStatus });
    const notes = req.body?.notes ? String(req.body.notes).trim().slice(0, 2000) : '';
    if (['rejected','changes_requested','blocked'].includes(nextStatus) && !notes) return res.status(400).json({ error: 'notes_required' });
    const result = await query(
      `UPDATE content_reviews
          SET reviewer_id = $2, status = $3,
              notes = CASE WHEN $4 <> '' THEN $4 ELSE notes END,
              resolved_at = CASE WHEN $3 IN ('approved','rejected','blocked') THEN NOW() ELSE NULL END
        WHERE id = $1
        RETURNING id, product_id, reviewer_id, status, reason_code, notes, created_at, resolved_at`,
      [req.params.id, req.user.id, nextStatus, notes]
    );
    const productStatus = {
      approved: 'approved',
      rejected: 'rejected',
      changes_requested: 'draft',
      blocked: 'suspended',
      pending: 'submitted'
    }[nextStatus];
    if (productStatus) {
      await query(
        `UPDATE products
            SET status = $2, moderation_status = $3,
                content_blocked = CASE WHEN $3 = 'blocked' THEN TRUE WHEN $3 IN ('approved','rejected','changes_requested','pending') THEN FALSE ELSE content_blocked END,
                published_at = CASE WHEN $2 <> 'published' THEN NULL ELSE published_at END,
                updated_at = NOW()
          WHERE id = $1`,
        [row.product_id, productStatus, nextStatus]
      );
    }
    await audit(req.user.id, `content.review.${row.status}_to_${nextStatus}`, req.params.id, { product_id: row.product_id, from_status: row.status, to_status: nextStatus, notes });
    res.json({ review: result.rows[0] });
  } catch (error) { next(error); }
});

router.get('/content/reports', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const values = [];
    let where = '';
    if (status) { values.push(status); where = 'WHERE r.status = $1'; }
    const result = await query(
      `SELECT r.id, r.product_id, r.reporter_id, r.reason_code, r.description,
              r.status, r.created_at, r.resolved_at, p.title AS product_title,
              u.email AS reporter_email
         FROM content_reports r
         LEFT JOIN products p ON p.id = r.product_id
         LEFT JOIN users u ON u.id = r.reporter_id
        ${where}
        ORDER BY r.created_at DESC LIMIT 200`, values
    );
    res.json({ reports: result.rows });
  } catch (error) { next(error); }
});

router.post('/content/reports/:id/status', async (req, res, next) => {
  try {
    const nextStatus = String(req.body?.status || '').trim();
    if (!Object.hasOwn(reportTransitions, nextStatus)) return res.status(400).json({ error: 'invalid_status' });
    const current = await query(`SELECT id, product_id, status FROM content_reports WHERE id = $1`, [req.params.id]);
    if (!current.rowCount) return res.status(404).json({ error: 'report_not_found' });
    const row = current.rows[0];
    if (!reportTransitions[row.status]?.has(nextStatus)) return res.status(409).json({ error: 'invalid_status_transition', from: row.status, to: nextStatus });
    const result = await query(
      `UPDATE content_reports SET status = $2, resolved_at = CASE WHEN $2 IN ('resolved','dismissed') THEN NOW() ELSE NULL END WHERE id = $1 RETURNING id, product_id, reporter_id, reason_code, description, status, created_at, resolved_at`,
      [req.params.id, nextStatus]
    );
    await audit(req.user.id, `content.report.${row.status}_to_${nextStatus}`, req.params.id, { product_id: row.product_id, from_status: row.status, to_status: nextStatus });
    res.json({ report: result.rows[0] });
  } catch (error) { next(error); }
});

router.post('/content/:productId/takedown', async (req, res, next) => {
  try {
    const reason = String(req.body?.reason || '').trim().slice(0, 1000);
    if (!reason) return res.status(400).json({ error: 'reason_required' });
    const product = await query(`SELECT id, title, status FROM products WHERE id = $1`, [req.params.productId]);
    if (!product.rowCount) return res.status(404).json({ error: 'product_not_found' });
    const review = await query(
      `INSERT INTO content_reviews (id, product_id, reviewer_id, status, reason_code, notes, created_at, resolved_at)
       VALUES ($1, $2, $3, 'blocked', 'admin_takedown', $4, NOW(), NOW())
       RETURNING id, product_id, reviewer_id, status, reason_code, notes, created_at, resolved_at`,
      [crypto.randomUUID(), req.params.productId, req.user.id, reason]
    );
    await audit(req.user.id, 'content.takedown', req.params.productId, { previous_product_status: product.rows[0].status, reason });
    res.json({ takedown: review.rows[0] });
  } catch (error) { next(error); }
});

export default router;
