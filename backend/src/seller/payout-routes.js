import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

async function getSellerProfileId(userId) {
  const result = await query('SELECT id FROM seller_profiles WHERE user_id = $1 AND status = \'active\' LIMIT 1', [userId]);
  return result.rows[0]?.id ?? null;
}

router.get('/payouts', async (req, res, next) => {
  try {
    const sellerId = await getSellerProfileId(req.user.id);
    if (!sellerId) return res.status(403).json({ error: 'seller_profile_not_found' });

    const result = await query(
      `SELECT id,
              amount_minor / 100.0 AS amount,
              currency,
              status,
              failure_reason,
              requested_at,
              reviewed_at,
              processed_at AS paid_at
         FROM seller_payout_requests
        WHERE seller_id = $1
        ORDER BY requested_at DESC
        LIMIT 100`,
      [sellerId]
    );
    return res.json({ payouts: result.rows });
  } catch (error) { return next(error); }
});

router.post('/payouts', async (req, res, next) => {
  try {
    const sellerId = await getSellerProfileId(req.user.id);
    if (!sellerId) return res.status(403).json({ error: 'seller_profile_not_found' });

    const amount = Number(req.body?.amount);
    const currency = String(req.body?.currency ?? 'JPY').trim().toUpperCase();
    if (!Number.isFinite(amount) || amount <= 0) return res.status(400).json({ error: 'invalid_amount' });
    if (!/^[A-Z]{3}$/.test(currency)) return res.status(400).json({ error: 'invalid_currency' });

    const amountMinor = Math.round(amount * 100);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      return res.status(400).json({ error: 'invalid_amount' });
    }

    const balance = await query(
      `SELECT COALESCE(SUM(net_amount), 0) AS available
         FROM seller_settlements
        WHERE seller_id = $1 AND currency = $2 AND status = 'available'`,
      [sellerId, currency]
    );
    const available = Number(balance.rows[0]?.available || 0);
    if (amount > available) return res.status(409).json({ error: 'insufficient_available_balance', available });

    const pending = await query(
      `SELECT COALESCE(SUM(amount_minor), 0) AS pending_minor
         FROM seller_payout_requests
        WHERE seller_id = $1 AND currency = $2
          AND status IN ('requested','reviewing','approved','processing')`,
      [sellerId, currency]
    );
    const pendingMinor = Number(pending.rows[0]?.pending_minor || 0);
    const availableMinor = Math.round(available * 100);
    if (amountMinor > Math.max(0, availableMinor - pendingMinor)) {
      return res.status(409).json({ error: 'amount_exceeds_withdrawable_balance', available, pending: pendingMinor / 100 });
    }

    const result = await query(
      `INSERT INTO seller_payout_requests (id, seller_id, amount_minor, currency, status)
       VALUES (gen_random_uuid(), $1, $2, $3, 'requested')
       RETURNING id, amount_minor / 100.0 AS amount, currency, status, requested_at`,
      [sellerId, amountMinor, currency]
    );
    return res.status(201).json({ payout: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
