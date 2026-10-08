import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

const MAX_PAGE_SIZE = 50;

function getPagination(req) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const perPage = Math.min(MAX_PAGE_SIZE, Math.max(1, Number.parseInt(req.query.per_page, 10) || 10));
  return { page, perPage, offset: (page - 1) * perPage };
}

router.get('/earnings', async (req, res, next) => {
  try {
    const { page, perPage, offset } = getPagination(req);
    const view = String(req.query.view || 'sales');

    const summary = await query(
      "SELECT COALESCE(SUM(CASE WHEN status IN ('available','paid') THEN net_amount ELSE 0 END), 0) AS earned_amount, COALESCE(SUM(CASE WHEN status = 'available' THEN net_amount ELSE 0 END), 0) AS available_amount, COALESCE(SUM(CASE WHEN status = 'paid' THEN net_amount ELSE 0 END), 0) AS paid_amount, COALESCE(SUM(CASE WHEN status = 'refunded' THEN gross_amount ELSE 0 END), 0) AS refunded_amount, COUNT(*) FILTER (WHERE status IN ('available','paid')) AS sale_count FROM seller_earnings WHERE seller_id = $1",
      [req.user.id]
    );

    if (view === 'monthly') {
      const result = await query(
        "SELECT DATE_TRUNC('month', e.created_at) AS month_start, COALESCE(SUM(e.gross_amount), 0) AS gross_amount, COALESCE(SUM(e.platform_fee), 0) AS platform_fee, COALESCE(SUM(e.net_amount), 0) AS net_amount, COUNT(*)::int AS sale_count, MIN(e.currency) AS currency FROM seller_earnings e WHERE e.seller_id = $1 AND e.status IN ('available','paid') GROUP BY DATE_TRUNC('month', e.created_at) ORDER BY month_start DESC LIMIT $2 OFFSET $3",
        [req.user.id, perPage, offset]
      );
      const count = await query(
        "SELECT COUNT(*)::int AS total FROM (SELECT DATE_TRUNC('month', created_at) FROM seller_earnings WHERE seller_id = $1 AND status IN ('available','paid') GROUP BY DATE_TRUNC('month', created_at)) months",
        [req.user.id]
      );
      const totalCount = count.rows[0]?.total || 0;
      return res.json({
        summary: summary.rows[0],
        earnings: result.rows,
        pagination: { page, per_page: perPage, total_count: totalCount, total_pages: Math.max(1, Math.ceil(totalCount / perPage)) },
      });
    }

    let where = 'e.seller_id = $1';
    const params = [req.user.id];
    if (view === 'current-month') where += " AND e.created_at >= DATE_TRUNC('month', CURRENT_TIMESTAMP)";
    if (view === 'sold-videos') where += " AND e.status IN ('available','paid')";

    const result = await query(
      'SELECT e.id, e.order_id, e.product_id, e.gross_amount, e.platform_fee, e.net_amount, e.currency, e.status, e.created_at, e.paid_at, e.refunded_at, p.title FROM seller_earnings e LEFT JOIN products p ON p.id = e.product_id WHERE ' + where + ' ORDER BY e.created_at DESC, e.id DESC LIMIT $2 OFFSET $3',
      [...params, perPage, offset]
    );
    const count = await query('SELECT COUNT(*)::int AS total FROM seller_earnings e WHERE ' + where, params);
    const totalCount = count.rows[0]?.total || 0;

    return res.json({
      summary: summary.rows[0],
      earnings: result.rows,
      pagination: { page, per_page: perPage, total_count: totalCount, total_pages: Math.max(1, Math.ceil(totalCount / perPage)) },
    });
  } catch (error) { return next(error); }
});

export default router;