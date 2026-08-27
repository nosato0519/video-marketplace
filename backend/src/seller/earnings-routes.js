import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

router.get('/earnings', async (req, res, next) => {
  try {
    const summary = await query(
      `SELECT
         COALESCE(SUM(CASE WHEN status IN ('available','paid') THEN net_amount ELSE 0 END), 0) AS earned_amount,
         COALESCE(SUM(CASE WHEN status = 'available' THEN net_amount ELSE 0 END), 0) AS available_amount,
         COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN status = 'refunded' THEN gross_amount ELSE 0 END), 0) AS refunded_amount,
         COUNT(*) FILTER (WHERE status IN ('available','paid')) AS sale_count
       FROM seller_earnings WHERE seller_id = $1`,
      [req.user.id]
    );
    const recent = await query(
      `SELECT id, order_id, product_id, gross_amount, platform_fee, net_amount,
              currency, status, created_at, paid_at, refunded_at
         FROM seller_earnings
        WHERE seller_id = $1
        ORDER BY created_at DESC
        LIMIT 100`,
      [req.user.id]
    );
    return res.json({ summary: summary.rows[0], earnings: recent.rows });
  } catch (error) { return next(error); }
});

export default router;
