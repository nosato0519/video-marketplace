import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const transitions = { pending: new Set(['under_review', 'approved', 'rejected']), under_review: new Set(['approved', 'rejected']) };

router.get('/seller-applications', async (req, res, next) => {
  try {
    const status = String(req.query.status || 'pending').trim();
    if (!['pending', 'under_review', 'approved', 'rejected', 'withdrawn'].includes(status)) return res.status(400).json({ error: 'invalid_status' });
    const result = await query(`SELECT a.id, a.user_id, u.email, a.status, a.display_name, a.legal_name, a.country_code, a.message, a.review_note, a.submitted_at, a.reviewed_at, a.reviewed_by, a.created_at, a.updated_at FROM seller_applications a JOIN users u ON u.id = a.user_id WHERE a.status = $1 ORDER BY a.submitted_at ASC LIMIT 200`, [status]);
    return res.json({ applications: result.rows });
  } catch (error) { return next(error); }
});

router.post('/seller-applications/:id/review', async (req, res, next) => {
  try {
    const action = String(req.body?.action || '').trim();
    const target = { start_review: 'under_review', approve: 'approved', reject: 'rejected' }[action];
    if (!target) return res.status(400).json({ error: 'invalid_review_action' });
    const note = req.body?.note == null ? null : String(req.body.note).trim().slice(0, 1000);
    if (action === 'reject' && !note) return res.status(400).json({ error: 'review_note_required' });
    const result = await withTransaction(async (client) => {
      const current = await client.query(`SELECT id, user_id, status FROM seller_applications WHERE id = $1 FOR UPDATE`, [req.params.id]);
      if (!current.rowCount) { const error = new Error('seller_application_not_found'); error.statusCode = 404; throw error; }
      const application = current.rows[0];
      if (!transitions[application.status]?.has(target)) { const error = new Error('invalid_seller_application_transition'); error.statusCode = 409; throw error; }
      const updated = await client.query(`UPDATE seller_applications SET status = $2, review_note = $3, reviewed_at = NOW(), reviewed_by = $4, updated_at = NOW() WHERE id = $1 RETURNING id, user_id, status, display_name, legal_name, country_code, message, review_note, submitted_at, reviewed_at, reviewed_by, updated_at`, [application.id, target, note, req.user.id]);
      if (target === 'approved') {
        await client.query(`UPDATE users SET role = 'seller', updated_at = NOW() WHERE id = $1 AND role = 'buyer'`, [application.user_id]);
        await client.query(`INSERT INTO seller_profiles (user_id, display_name, legal_name, country_code) VALUES ($1, $2, $3, $4) ON CONFLICT (user_id) DO UPDATE SET display_name = EXCLUDED.display_name, legal_name = EXCLUDED.legal_name, country_code = EXCLUDED.country_code, updated_at = NOW()`, [application.user_id, updated.rows[0].display_name, updated.rows[0].legal_name, updated.rows[0].country_code]);
      }
      await client.query(`INSERT INTO audit_events (actor_user_id, action, resource_type, resource_id, metadata) VALUES ($1, $2, 'seller_application', $3, $4::jsonb)`, [req.user.id, `seller.application.${action}`, application.id, JSON.stringify({ from_status: application.status, to_status: target, user_id: application.user_id, note })]);
      return updated.rows[0];
    });
    return res.json({ application: result });
  } catch (error) { return next(error); }
});

export default router;
