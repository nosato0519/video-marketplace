import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const transitions = {
  submitted: new Set(['under_review', 'verified', 'rejected']),
  under_review: new Set(['verified', 'rejected']),
  rejected: new Set(['submitted']),
  verified: new Set()
};

async function audit(actor, action, resourceId, metadata) {
  await query(`INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1,$2,'seller',$3,$4::jsonb)`, [actor, action, resourceId, JSON.stringify(metadata)]);
}

router.get('/seller-verifications', async (req, res, next) => {
  try {
    const status = String(req.query.status || 'submitted').trim();
    const allowed = new Set(['submitted','under_review','verified','rejected','not_started']);
    if (!allowed.has(status)) return res.status(400).json({ error: 'invalid_status' });
    const result = await query(`SELECT sp.user_id, sp.display_name, sp.legal_name, sp.country_code, sp.verification_status, sp.verification_note, sp.submitted_at, sp.verified_at, u.email FROM seller_profiles sp JOIN users u ON u.id=sp.user_id WHERE sp.verification_status=$1 ORDER BY sp.submitted_at DESC NULLS LAST LIMIT 200`, [status]);
    return res.json({ sellers: result.rows });
  } catch (e) { return next(e); }
});

router.post('/seller-verifications/:userId/review', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').trim();
    const target = { request_changes: 'rejected', reject: 'rejected', approve: 'verified', start_review: 'under_review' }[action];
    if (!target) return res.status(400).json({ error: 'invalid_review_action' });
    const current = await query(`SELECT user_id, verification_status FROM seller_profiles WHERE user_id=$1`, [req.params.userId]);
    if (!current.rowCount) return res.status(404).json({ error: 'seller_profile_not_found' });
    const from = current.rows[0].verification_status;
    if (!transitions[from]?.has(target)) return res.status(409).json({ error: 'invalid_verification_transition', from, to: target });
    const note = req.body?.note == null ? null : String(req.body.note).trim().slice(0, 1000);
    if ((action === 'reject' || action === 'request_changes') && !note) return res.status(400).json({ error: 'review_note_required' });
    const result = await query(`UPDATE seller_profiles SET verification_status=$2, verification_note=$3, verified_at=CASE WHEN $2='verified' THEN NOW() ELSE verified_at END, updated_at=NOW() WHERE user_id=$1 RETURNING user_id, display_name, legal_name, country_code, verification_status, verification_note, submitted_at, verified_at`, [req.params.userId, target, note]);
    await audit(req.user.id, `seller.verification.${action}`, req.params.userId, { from_status: from, to_status: target, note });
    return res.json({ profile: result.rows[0] });
  } catch (e) { return next(e); }
});

router.get('/seller-verifications/:userId/audit', async (req, res, next) => {
  try {
    const result = await query(`SELECT a.id, a.actor_user_id, u.email AS actor_email, a.action, a.metadata, a.created_at FROM audit_events a LEFT JOIN users u ON u.id=a.actor_user_id WHERE a.resource_type='seller' AND a.resource_id=$1 ORDER BY a.created_at DESC LIMIT 100`, [req.params.userId]);
    return res.json({ events: result.rows });
  } catch (e) { return next(e); }
});

export default router;
