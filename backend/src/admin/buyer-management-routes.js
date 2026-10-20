import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

router.get('/buyers', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.display_name, u.status, u.created_at,
              COUNT(o.id) FILTER (WHERE o.paid_at IS NOT NULL)::int AS purchase_count,
              COALESCE(SUM(o.amount) FILTER (WHERE o.paid_at IS NOT NULL), 0) AS total_spent
         FROM users u
         LEFT JOIN orders o ON o.buyer_id = u.id
        WHERE u.role = 'buyer'
        GROUP BY u.id, u.email, u.display_name, u.status, u.created_at
        ORDER BY u.created_at DESC
        LIMIT 500`
    );
    return res.json({
      buyers: result.rows.map((buyer) => ({
        id: buyer.id,
        email: buyer.email,
        displayName: buyer.display_name || '',
        status: buyer.status,
        createdAt: buyer.created_at,
        purchaseCount: Number(buyer.purchase_count || 0),
        totalSpent: Number(buyer.total_spent || 0),
      })),
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
