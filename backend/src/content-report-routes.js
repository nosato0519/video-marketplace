import express from 'express';
import crypto from 'node:crypto';
import { query } from './db.js';
import { requireAuth } from './auth/require-auth.js';

const router = express.Router();

router.post('/products/:productId/reports', requireAuth, async (req, res, next) => {
  try {
    const reasonCode = String(req.body?.reason_code || '').trim().slice(0, 100);
    const description = String(req.body?.description || '').trim().slice(0, 2000);
    const allowedReasons = new Set(['copyright', 'privacy', 'prohibited_content', 'illegal_content', 'abuse', 'other']);
    if (!allowedReasons.has(reasonCode)) return res.status(400).json({ error: 'invalid_reason_code' });
    if (description.length < 10) return res.status(400).json({ error: 'description_too_short' });

    const product = await query(
      `SELECT p.id
         FROM products p
         JOIN seller_profiles sp ON sp.id = p.seller_id
        WHERE p.id = $1
          AND p.status = 'published'
          AND sp.status = 'active'
          AND NOT EXISTS (
            SELECT 1 FROM content_reviews cr
             WHERE cr.product_id = p.id AND cr.status = 'blocked'
          )
        LIMIT 1`,
      [req.params.productId]
    );
    if (!product.rowCount) return res.status(404).json({ error: 'not_found' });

    const duplicate = await query(
      `SELECT id FROM content_reports
        WHERE product_id = $1 AND reporter_id = $2 AND status IN ('open','reviewing')
        LIMIT 1`,
      [req.params.productId, req.user.id]
    );
    if (duplicate.rowCount) return res.status(409).json({ error: 'report_already_open' });

    const result = await query(
      `INSERT INTO content_reports (id, product_id, reporter_id, reason_code, description, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'open', NOW())
       RETURNING id, product_id, reason_code, description, status, created_at`,
      [crypto.randomUUID(), req.params.productId, req.user.id, reasonCode, description]
    );
    res.status(201).json({ report: result.rows[0] });
  } catch (error) { next(error); }
});

export default router;
