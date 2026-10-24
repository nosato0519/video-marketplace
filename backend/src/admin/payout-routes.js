import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { settlePaidPayoutEarnings } from '../seller/payout-earnings-settlement.js';

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

async function audit(db, actorUserId, action, resourceId, metadata = {}) {
  await db.query(
    `INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata)
     VALUES ($1, $2, 'payout', $3, $4::jsonb)`,
    [actorUserId, action, resourceId, JSON.stringify(metadata)]
  );
}

router.get('/payouts', async (req, res, next) => {
  try {
    const status = String(req.query.status || '').trim();
    const values = [];
    const where = status ? 'WHERE p.status = $1' : '';
    if (status) values.push(status);

    const result = await query(
      `SELECT p.id, p.seller_id, p.amount, p.currency, p.status, p.failure_reason,
              p.requested_at, p.reviewed_at, p.paid_at, u.email AS seller_email
         FROM payouts p JOIN users u ON u.id = p.seller_id
        ${where}
        ORDER BY p.requested_at DESC LIMIT 200`,
      values
    );
    return res.json({ payouts: result.rows });
  } catch (error) { return next(error); }
});

router.get('/payouts/:id/audit', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.resource_id, a.metadata, a.created_at
         FROM audit_events a LEFT JOIN users u ON u.id = a.actor_user_id
        WHERE a.resource_type = 'payout' AND a.resource_id = $1
        ORDER BY a.created_at DESC LIMIT 100`,
      [req.params.id]
    );
    return res.json({ events: result.rows });
  } catch (error) { return next(error); }
});

router.post('/payouts/:id/status', async (req, res, next) => {
  try {
    const nextStatus = String(req.body?.status || '').trim();
    const result = await withTransaction(async (db) => {
      const current = await db.query(
        `SELECT id, status FROM payouts WHERE id = $1 FOR UPDATE`,
        [req.params.id]
      );
      if (!current.rowCount) return { kind: 'not_found' };

      const from = current.rows[0].status;
      if (!allowedTransitions[from]?.has(nextStatus)) {
        return { kind: 'invalid', from, to: nextStatus };
      }

      if (nextStatus === 'processing' || nextStatus === 'paid') {
        const refundedAllocation = await db.query(
          `SELECT e.id
             FROM seller_earnings e
            WHERE e.id IN (
                SELECT seller_earning_id
                  FROM payout_earnings_allocations
                 WHERE payout_id = $1
                UNION
                SELECT seller_earning_id
                  FROM seller_earning_recovery_offsets
                 WHERE payout_id = $1
              )
              AND (
                e.status = 'refunded'
                OR (
                  COALESCE((
                    SELECT SUM(a.amount)
                      FROM payout_earnings_allocations a
                      JOIN payouts ap ON ap.id = a.payout_id
                     WHERE a.seller_earning_id = e.id
                       AND ap.status <> 'cancelled'
                  ), 0)
                  + COALESCE((
                    SELECT SUM(o.amount)
                      FROM seller_earning_recovery_offsets o
                      JOIN payouts op ON op.id = o.payout_id
                     WHERE o.seller_earning_id = e.id
                       AND op.status <> 'cancelled'
                  ), 0)
                ) > e.net_amount
              )
            LIMIT 1
            FOR UPDATE OF e`,
          [req.params.id]
        );
        if (refundedAllocation.rowCount > 0) {
          return { kind: 'refunded_earnings' };
        }
      }

      const reason = req.body?.failure_reason
        ? String(req.body.failure_reason).slice(0, 500)
        : null;
      const updated = await db.query(
        `UPDATE payouts
            SET status = $2,
                reviewed_by = CASE WHEN $2 IN ('reviewing','approved','processing','failed','cancelled') THEN $3 ELSE reviewed_by END,
                failure_reason = CASE WHEN $2 = 'failed' THEN $4 ELSE failure_reason END,
                reviewed_at = CASE WHEN $2 IN ('reviewing','approved','processing','failed','cancelled') THEN COALESCE(reviewed_at, NOW()) ELSE reviewed_at END,
                paid_at = CASE WHEN $2 = 'paid' THEN COALESCE(paid_at, NOW()) ELSE paid_at END
          WHERE id = $1
          RETURNING id, seller_id, amount, currency, status, failure_reason, requested_at, reviewed_at, paid_at`,
        [req.params.id, nextStatus, req.user.id, reason]
      );

      if (nextStatus === 'cancelled') {
        // Release earning allocations and recovery offsets so cancelled payouts do not reserve seller funds.
        await db.query(
          `DELETE FROM payout_earnings_allocations WHERE payout_id = $1`,
          [req.params.id]
        );
        await db.query(
          `DELETE FROM seller_earning_recovery_offsets WHERE payout_id = $1`,
          [req.params.id]
        );
      }

      if (nextStatus === 'paid') {
        const offsets = await db.query(
          `SELECT recovery_id, SUM(amount) AS amount
             FROM seller_earning_recovery_offsets
            WHERE payout_id = $1
            GROUP BY recovery_id`,
          [req.params.id]
        );
        for (const offset of offsets.rows) {
          await db.query(
            `UPDATE seller_earning_recoveries
                SET amount_recovered = LEAST(amount_due, amount_recovered + $2),
                    updated_at = NOW()
              WHERE id = $1`,
            [offset.recovery_id, offset.amount]
          );
        }
        await settlePaidPayoutEarnings(db, req.params.id);
      }

      await audit(db, req.user.id, `payout.status.${from}_to_${nextStatus}`, req.params.id, {
        from_status: from,
        to_status: nextStatus,
        failure_reason: nextStatus === 'failed' ? reason : null
      });
      return { kind: 'ok', payout: updated.rows[0] };
    });

    if (result.kind === 'not_found') return res.status(404).json({ error: 'payout_not_found' });
    if (result.kind === 'invalid') return res.status(409).json({ error: 'invalid_status_transition', from: result.from, to: result.to });
    if (result.kind === 'refunded_earnings') {
      return res.status(409).json({ error: 'payout_contains_refunded_earnings' });
    }
    return res.json({ payout: result.payout });
  } catch (error) { return next(error); }
});

export default router;
