import express from 'express';
import { getPool, query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

async function requireVerifiedSeller(req, res, next) {
  try {
    const setting = await query(
      "SELECT setting_value->>'value' AS method FROM platform_settings WHERE setting_key = 'seller_verification_method' LIMIT 1"
    );
    const configuredMethod = setting.rows[0]?.method;
    const method = ['email', 'document'].includes(configuredMethod) ? configuredMethod : 'none';
    if (method === 'none') return next();

    const result = await query(
      `SELECT sp.verification_status, svd.status AS verification_document_status
         FROM seller_profiles sp
         LEFT JOIN seller_verification_documents svd ON svd.user_id = sp.user_id
        WHERE sp.user_id = $1`,
      [req.user.id]
    );
    if (result.rows[0]?.verification_status === 'verified'
      && (method === 'email' || result.rows[0]?.verification_document_status === 'approved')) return next();
    return res.status(403).json({
      error: {
        code: 'SELLER_VERIFICATION_REQUIRED',
        message: 'Seller verification approval is required before requesting a payout.',
      },
    });
  } catch (error) {
    return next(error);
  }
}

router.use(requireVerifiedSeller);

router.get('/payouts', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(50, Math.max(1, Number.parseInt(req.query.per_page, 10) || 10));
    const offset = (page - 1) * perPage;
    const result = await query(
      `SELECT id, amount, currency, status, failure_reason, requested_at, reviewed_at, paid_at
         FROM payouts
        WHERE seller_id = $1
        ORDER BY requested_at DESC, id DESC
        LIMIT $2 OFFSET $3`,
      [req.user.id, perPage, offset]
    );
    const total = await query('SELECT COUNT(*)::int AS total FROM payouts WHERE seller_id = $1', [req.user.id]);

    const summary = await query(
      `SELECT currency,
              COALESCE(SUM(CASE WHEN status = 'available' THEN net_amount ELSE 0 END), 0) AS available,
              COALESCE(SUM(CASE WHEN status = 'pending' THEN net_amount ELSE 0 END), 0) AS pending
         FROM seller_earnings
        WHERE seller_id = $1
        GROUP BY currency
        ORDER BY currency ASC`,
      [req.user.id]
    );

    const reserved = await query(
      `SELECT currency, SUM(reserved_amount) AS reserved_amount
         FROM (
           SELECT e.currency, a.amount AS reserved_amount
             FROM payout_earnings_allocations a
             JOIN payouts p ON p.id = a.payout_id
             JOIN seller_earnings e ON e.id = a.seller_earning_id
            WHERE e.seller_id = $1
              AND e.status = 'available'
              AND p.status <> 'cancelled'
           UNION ALL
           SELECT e.currency, o.amount AS reserved_amount
             FROM seller_earning_recovery_offsets o
             JOIN payouts op ON op.id = o.payout_id
             JOIN seller_earnings e ON e.id = o.seller_earning_id
            WHERE e.seller_id = $1 AND e.status = 'available'
              AND op.status <> 'cancelled'
         ) reservations
        GROUP BY currency`,
      [req.user.id]
    );
    const recoveryDebts = await query(
      `SELECT r.currency, COALESCE(SUM(GREATEST(0, r.amount_due - r.amount_recovered - COALESCE(reserved.amount, 0))), 0) AS outstanding
         FROM seller_earning_recoveries r
         LEFT JOIN LATERAL (
           SELECT SUM(o.amount) AS amount
             FROM seller_earning_recovery_offsets o
             JOIN payouts p ON p.id = o.payout_id
            WHERE o.recovery_id = r.id
              AND p.status IN ('requested','reviewing','approved','processing','failed')
         ) reserved ON TRUE
        WHERE r.seller_id = $1 AND r.amount_due > r.amount_recovered
        GROUP BY r.currency`,
      [req.user.id]
    );

    const reservedByCurrency = new Map(
      reserved.rows.map((row) => [row.currency, Number(row.reserved_amount || 0)])
    );
    const recoveryByCurrency = new Map(
      recoveryDebts.rows.map((row) => [row.currency, Number(row.outstanding || 0)])
    );

    const summaryByCurrency = Object.fromEntries(
      summary.rows.map((row) => {
        const earnedAvailable = Number(row.available || 0);
        const pending = Number(row.pending || 0);
        const reservedAmount = reservedByCurrency.get(row.currency) || 0;
        const outstandingRecovery = recoveryByCurrency.get(row.currency) || 0;
        const available = Math.max(0, earnedAvailable - reservedAmount);
        return [row.currency, {
          available,
          pending,
          withdrawable: Math.max(0, available - outstandingRecovery),
          recovery_due: outstandingRecovery,
        }];
      })
    );

    // Keep the currency-specific view while exposing the default JPY totals at
    // the response contract used by the seller earnings/payout E2E.
    const defaultSummary = summaryByCurrency.JPY || {
      available: 0,
      pending: 0,
      withdrawable: 0,
    };

    const totalCount = total.rows[0]?.total || 0;

    return res.json({
      payouts: result.rows,
      pagination: {
        page,
        per_page: perPage,
        total_count: totalCount,
        total_pages: Math.max(1, Math.ceil(totalCount / perPage)),
      },
      summary: {
        available: defaultSummary.available,
        pending: defaultSummary.pending,
        withdrawable: defaultSummary.withdrawable,
        ...summaryByCurrency,
      },
    });
  } catch (error) { return next(error); }
});

router.post('/payouts', async (req, res, next) => {
  const client = await getPool().connect();
  try {
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency ?? 'JPY').trim().toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0 || !Number.isSafeInteger(Math.round(amount * 100))) return res.status(400).json({ error: 'invalid_amount' });
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'invalid_currency' });
    if (currency === 'JPY' && !Number.isSafeInteger(amount)) return res.status(400).json({ error: 'invalid_amount' });

    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2))`, [String(req.user.id), currency]);

    // Lock eligible earnings before reading balances so concurrent refunds cannot leave stale payout allocations.
    await client.query(
      `SELECT id
         FROM seller_earnings
        WHERE seller_id = $1 AND currency = $2 AND status = 'available'
        ORDER BY created_at ASC, id ASC
        FOR UPDATE`,
      [req.user.id, currency]
    );

    const balance = await client.query(
      `SELECT COALESCE(SUM(net_amount), 0) AS available
         FROM seller_earnings
        WHERE seller_id = $1 AND currency = $2 AND status = 'available'`,
      [req.user.id, currency]
    );
    const allocated = await client.query(
      `SELECT COALESCE(SUM(a.amount), 0) AS allocated_amount
         FROM payout_earnings_allocations a
         JOIN payouts p ON p.id = a.payout_id
         JOIN seller_earnings e ON e.id = a.seller_earning_id
        WHERE e.seller_id = $1 AND e.currency = $2
          AND e.status = 'available'
          AND p.status <> 'cancelled'`,
      [req.user.id, currency]
    );
    const offsetBalance = await client.query(
      `SELECT COALESCE(SUM(o.amount), 0) AS offset_amount
         FROM seller_earning_recovery_offsets o
         JOIN payouts op ON op.id = o.payout_id
         JOIN seller_earnings e ON e.id = o.seller_earning_id
        WHERE e.seller_id = $1 AND e.currency = $2 AND e.status = 'available'
          AND op.status <> 'cancelled'`,
      [req.user.id, currency]
    );
    const debtBalance = await client.query(
      `SELECT COALESCE(SUM(GREATEST(0, r.amount_due - r.amount_recovered - COALESCE(reserved.amount, 0))), 0) AS outstanding
         FROM seller_earning_recoveries r
         LEFT JOIN LATERAL (
           SELECT SUM(o.amount) AS amount
             FROM seller_earning_recovery_offsets o
             JOIN payouts p ON p.id = o.payout_id
            WHERE o.recovery_id = r.id
              AND p.status IN ('requested','reviewing','approved','processing','failed')
         ) reserved ON TRUE
        WHERE r.seller_id = $1 AND r.currency = $2 AND r.amount_due > r.amount_recovered`,
      [req.user.id, currency]
    );
    const available = Number(balance.rows[0]?.available || 0);
    const reservedAmount = Number(allocated.rows[0]?.allocated_amount || 0);
    const offsetsAlreadyApplied = Number(offsetBalance.rows[0]?.offset_amount || 0);
    const outstandingRecovery = Number(debtBalance.rows[0]?.outstanding || 0);
    const withdrawable = Math.max(0, available - reservedAmount - offsetsAlreadyApplied - outstandingRecovery);

    if (amount < 1000) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'minimum_payout_not_reached', minimum: 1000 });
    }

    if (amount > withdrawable) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        error: 'amount_exceeds_withdrawable_balance',
        available: Math.max(0, available - reservedAmount - offsetsAlreadyApplied),
        reserved: reservedAmount,
        recovery_due: outstandingRecovery,
      });
    }

    const result = await client.query(
      `INSERT INTO payouts (id, seller_id, amount, currency, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'requested')
       RETURNING id, amount, currency, status, requested_at`,
      [req.user.id, amount, currency]
    );
    const payoutId = result.rows[0].id;

    const earningRows = await client.query(
      `SELECT e.id, e.net_amount, e.created_at,
              COALESCE(alloc.total, 0) AS allocated_amount,
              COALESCE(offsets.total, 0) AS offset_amount
         FROM seller_earnings e
         LEFT JOIN LATERAL (
           SELECT SUM(a.amount) AS total
             FROM payout_earnings_allocations a
             JOIN payouts p ON p.id = a.payout_id
            WHERE a.seller_earning_id = e.id
              AND p.status <> 'cancelled'
         ) alloc ON TRUE
         LEFT JOIN LATERAL (
           SELECT SUM(o.amount) AS total
             FROM seller_earning_recovery_offsets o
             JOIN payouts op ON op.id = o.payout_id
            WHERE o.seller_earning_id = e.id
              AND op.status <> 'cancelled'
         ) offsets ON TRUE
        WHERE e.seller_id = $1 AND e.currency = $2 AND e.status = 'available'
        ORDER BY e.created_at ASC, e.id ASC`,
      [req.user.id, currency]
    );
    const remainingByEarning = new Map(earningRows.rows.map((earning) => [
      earning.id,
      Math.max(0, Number(earning.net_amount) - Number(earning.allocated_amount || 0) - Number(earning.offset_amount || 0)),
    ]));
    // Earnings are already locked before balance and allocation calculations.

    const recoveries = await client.query(
      `SELECT r.id, r.amount_due, r.amount_recovered,
              COALESCE(reserved.amount, 0) AS amount_reserved
         FROM seller_earning_recoveries r
         LEFT JOIN LATERAL (
           SELECT SUM(o.amount) AS amount
             FROM seller_earning_recovery_offsets o
             JOIN payouts p ON p.id = o.payout_id
            WHERE o.recovery_id = r.id
              AND p.status IN ('requested','reviewing','approved','processing','failed')
         ) reserved ON TRUE
        WHERE r.seller_id = $1 AND r.currency = $2 AND r.amount_due > r.amount_recovered
        ORDER BY r.created_at ASC, r.id ASC
        FOR UPDATE OF r`,
      [req.user.id, currency]
    );
    for (const recovery of recoveries.rows) {
      let debtRemaining = Math.max(0,
        Number(recovery.amount_due) - Number(recovery.amount_recovered) - Number(recovery.amount_reserved || 0)
      );
      for (const earning of earningRows.rows) {
        if (debtRemaining <= 0) break;
        const availableForOffset = remainingByEarning.get(earning.id) || 0;
        if (availableForOffset <= 0) continue;
        const offset = Math.min(debtRemaining, availableForOffset);
        await client.query(
          `INSERT INTO seller_earning_recovery_offsets
             (recovery_id, seller_earning_id, payout_id, amount)
           VALUES ($1, $2, $3, $4)`,
          [recovery.id, earning.id, payoutId, offset]
        );
        remainingByEarning.set(earning.id, availableForOffset - offset);
        debtRemaining -= offset;
      }
    }

    let remaining = amount;
    for (const earning of earningRows.rows) {
      if (remaining <= 0) break;
      const remainingEarning = remainingByEarning.get(earning.id) || 0;
      const allocation = Math.min(remaining, remainingEarning);
      if (allocation <= 0) continue;
      await client.query(
        `INSERT INTO payout_earnings_allocations (payout_id, seller_earning_id, amount)
         VALUES ($1, $2, $3)`,
        [payoutId, earning.id, allocation]
      );
      remainingByEarning.set(earning.id, remainingEarning - allocation);
      remaining -= allocation;
    }

    if (remaining > 0.000001) {
      throw new Error('payout_allocation_invariant_failed');
    }

    await client.query('COMMIT');
    return res.status(201).json({ payout: result.rows[0] });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    return next(error);
  } finally {
    client.release();
  }
});

export default router;
