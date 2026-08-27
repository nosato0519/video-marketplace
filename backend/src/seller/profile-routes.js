import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('seller'));

router.get('/profile', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT user_id, display_name, legal_name, country_code, verification_status,
              verification_note, submitted_at, verified_at, created_at, updated_at
         FROM seller_profiles WHERE user_id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) {
      return res.json({ profile: {
        userId: req.user.id,
        displayName: '', legalName: '', countryCode: null,
        verificationStatus: 'not_started', verificationNote: null,
        submittedAt: null, verifiedAt: null
      }});
    }
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

router.patch('/profile', async (req, res, next) => {
  try {
    const displayName = String(req.body?.displayName ?? '').trim().slice(0, 120);
    const legalName = String(req.body?.legalName ?? '').trim().slice(0, 200);
    const countryCode = req.body?.countryCode == null ? null : String(req.body.countryCode).trim().toUpperCase().slice(0, 2);
    if (!displayName || !legalName) return res.status(400).json({ error: 'display_name_and_legal_name_required' });
    if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return res.status(400).json({ error: 'invalid_country_code' });

    const result = await query(
      `INSERT INTO seller_profiles (user_id, display_name, legal_name, country_code)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id) DO UPDATE SET
         display_name = EXCLUDED.display_name,
         legal_name = EXCLUDED.legal_name,
         country_code = EXCLUDED.country_code,
         updated_at = NOW()
       RETURNING user_id, display_name, legal_name, country_code, verification_status,
                 verification_note, submitted_at, verified_at, created_at, updated_at`,
      [req.user.id, displayName, legalName, countryCode]
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

router.post('/profile/submit-verification', async (req, res, next) => {
  try {
    const existing = await query(`SELECT display_name, legal_name, country_code, verification_status FROM seller_profiles WHERE user_id = $1`, [req.user.id]);
    const profile = existing.rows[0];
    if (!profile?.display_name || !profile.legal_name || !profile.country_code) return res.status(400).json({ error: 'complete_seller_profile_first' });
    if (profile.verification_status === 'verified') return res.status(409).json({ error: 'seller_already_verified' });
    if (profile.verification_status === 'submitted' || profile.verification_status === 'under_review') return res.status(409).json({ error: 'verification_already_submitted' });

    const result = await query(
      `UPDATE seller_profiles
          SET verification_status = 'submitted', submitted_at = NOW(), verification_note = NULL, updated_at = NOW()
        WHERE user_id = $1
      RETURNING user_id, display_name, legal_name, country_code, verification_status, submitted_at, verified_at`,
      [req.user.id]
    );
    return res.json({ profile: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
