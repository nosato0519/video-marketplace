import express from 'express';
import { getPool, query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

router.get('/payouts', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id,
              amount,
              currency,
              status,
              failure_reason,
              requested_at,
              reviewed_at,
              paid_at
         FROM payouts
        WHERE seller_id = $1
        ORDER BY requested_at DESC
        LIMIT 100`,
      [req.user.id]
    );

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
      `SELECT currency,
              COALESCE(SUM(amount), 0) AS reserved_amount
         FROM payouts
        WHERE seller_id = $1
          AND status NOT IN ('failed','cancelled')
        GROUP BY currency`,
      [req.user.id]
    );

    const reservedByCurrency = new Map(
      reserved.rows.map((row) => [row.currency, Number(row.reserved_amount || 0)])
    );

    const summaryByCurrency = Object.fromEntries(
      summary.rows.map((row) => {
        const available = Number(row.available || 0);
        const pending = Number(row.pending || 0);
        const reservedAmount = reservedByCurrency.get(row.currency) || 0;
        return [row.currency, {
          available,
          pending,
          withdrawable: Math.max(0, available - reservedAmount),
        }];
      })
    );

    return res.json({
      payouts: result.rows,
      summary: summaryByCurrency,
    });
  } catch (error) { return next(error); }
});

router.post('/payouts', async (req, res, next) => {
  const client = await getPool().connect();
  try {
    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency ?? 'JPY').trim().toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' });
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'invalid_currency' });

    await client.query('BEGIN');
    await client.query(`SELECT pg_advisory_xact_lock(hashtext($1 || ':' || $2))`, [String(req.user.id), currency]);

    const balance = await client.query(
      `SELECT COALESCE(SUM(net_amount), 0) AS available
         FROM seller_earnings
        WHERE seller_id = $1 AND currency = $2 AND status = 'available'`,
      [req.user.id, currency]
    );
    const available = Number(balance.rows[0]?.available || 0);

    const reserved = await client.query(
      `SELECT COALESCE(SUM(amount), 0) AS reserved_amount
         FROM payouts
        WHERE seller_id = $1 AND currency = $2
          AND status NOT IN ('failed','cancelled')`,
      [req.user.id, currency]
    );
    const reservedAmount = Number(reserved.rows[0]?.reserved_amount || 0);
    const withdrawable = Math.max(0, available - reservedAmount);

    if (amount < 1000) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'minimum_payout_not_reached', minimum: 1000 });
    }

    if (amount > withdrawable) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'amount_exceeds_withdrawable_balance', available, reserved: reservedAmount });
    }

    const result = await client.query(
      `INSERT INTO payouts (id, seller_id, amount, currency, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'requested')
       RETURNING id, amount, currency, status, requested_at`,
      [req.user.id, amount, currency]
    );
    const payoutId = result.rows[0].id;

    let remaining = amount;
    // PostgreSQL does not permit FOR UPDATE on a grouped SELECT. Aggregate the
    // allocation data first, then lock the underlying earning rows in a separate
    // simple SELECT so the seller/currency advisory lock plus row locks still
    // provide the intended concurrency protection.
    const earnings = await client.query(
      `SELECT e.id,
              e.net_amount,
              COALESCE(SUM(CASE WHEN p.status NOT IN ('failed','cancelled') THEN a.amount ELSE 0 END), 0) AS allocated_amount
         FROM seller_earnings e
         LEFT JOIN payout_earnings_allocations a ON a.seller_earning_id = e.id
         LEFT JOIN payouts p ON p.id = a.payout_id
        WHERE e.seller_id = $1
          AND e.currency = $2
          AND e.status = 'available'
        GROUP BY e.id, e.net_amount, e.created_at
        HAVING e.net_amount - COALESCE(SUM(CASE WHEN p.status NOT IN ('failed','cancelled') THEN a.amount ELSE 0 END), 0) > 0
        ORDER BY e.created_at ASC, e.id ASC`,
      [req.user.id, currency]
    );

    for (const earning of earnings.rows) {
      if (remaining <= 0) break;
      await client.query(
        `SELECT id FROM seller_earnings WHERE id = $1 FOR UPDATE`,
        [earning.id]
      );
      const netAmount = Number(earning.net_amount);
      const allocated = Number(earning.allocated_amount || 0);
      const remainingEarning = Math.max(0, netAmount - allocated);
      const allocation = Math.min(remaining, remainingEarning);
      if (allocation <= 0) continue;
      await client.query(
        `INSERT INTO payout_earnings_allocations (payout_id, seller_earning_id, amount)
         VALUES ($1, $2, $3)`,
        [payoutId, earning.id, allocation]
      );
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
