import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const allowedTransitions = {
  requested: new Set(['reviewing', 'cancelled']),
  reviewing: new Set(['approved', 'processing', 'failed', 'cancelled']),
  approved: new Set(['processing', 'cancelled']),
  processing: new Set(['paid', 'failed']),
  paid: new Set(),
  failed: new Set(['reviewing']),
  cancelled: new Set()
};

async function audit(actorUserId, action, resourceId, metadata = {}) {
  await query(
    `INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, 'payout', $3, $4::jsonb)`,
    [actorUserId, action, resourceId, JSON.stringify(metadata)]
  );
}

router.get('/payouts', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT p.id,
              p.seller_id,
              p.amount,
              p.currency,
              p.status,
              p.failure_reason,
              p.requested_at,
              p.reviewed_at,
              p.paid_at,
              u.email AS seller_email
         FROM payouts p
         JOIN users u ON u.id = p.seller_id
        ORDER BY p.requested_at DESC
        LIMIT 200`
    );
    return res.json({ payouts: result.rows });
  } catch (error) { return next(error); }
});

router.get('/payouts/:id/audit', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.metadata, a.created_at
         FROM audit_events a
         LEFT JOIN users u ON u.id = a.actor_user_id
        WHERE a.resource_type = 'payout' AND a.resource_id = $1
        ORDER BY a.created_at DESC
        LIMIT 100`,
      [req.params.id]
    );
    return res.json({ events: result.rows });
  } catch (error) { return next(error); }
});

router.post('/payouts/:id/status', async (req, res, next) => {
  try {
    const nextStatus = String(req.body?.status || '').trim();
    const current = await query(
      `SELECT id, status FROM payouts WHERE id = $1`,
      [req.params.id]
    );
    if (!current.rowCount) return res.status(404).json({ error: 'payout_not_found' });

    const from = current.rows[0].status;
    if (!allowedTransitions[from]?.has(nextStatus)) {
      return res.status(409).json({ error: 'invalid_status_transition', from, to: nextStatus });
    }

    const reason = req.body?.failure_reason
      ? String(req.body.failure_reason).slice(0, 500)
      : null;

    const result = await query(
      `UPDATE payouts
          SET status = $2,
              reviewed_by = CASE
                WHEN $2 IN ('reviewing','approved','processing','failed','cancelled')
                THEN $3
                ELSE reviewed_by
              END,
              failure_reason = CASE WHEN $2 = 'failed' THEN $4 ELSE failure_reason END,
              reviewed_at = CASE
                WHEN $2 IN ('reviewing','approved','processing','failed','cancelled')
                THEN COALESCE(reviewed_at, NOW())
                ELSE reviewed_at
              END,
              paid_at = CASE WHEN $2 = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
        WHERE id = $1
        RETURNING id, seller_id, amount, currency, status, failure_reason,
                  requested_at, reviewed_at, paid_at`,
      [req.params.id, nextStatus, req.user.id, reason]
    );

    await audit(
      req.user.id,
      `payout.status.${from}_to_${nextStatus}`,
      req.params.id,
      { from_status: from, to_status: nextStatus, failure_reason: nextStatus === 'failed' ? reason : null }
    );

    return res.json({ payout: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
