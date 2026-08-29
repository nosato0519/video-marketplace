import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';

const router = express.Router();
router.use(requireAuth);

const normalizeText = (value, max) => String(value ?? '').trim().slice(0, max);

router.get('/application', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, status,
              display_name AS "displayName",
              legal_name AS "legalName",
              country_code AS "countryCode",
              message,
              review_note AS "reviewNote",
              submitted_at AS "submittedAt",
              reviewed_at AS "reviewedAt",
              reviewed_by AS "reviewedBy",
              created_at AS "createdAt",
              updated_at AS "updatedAt"
         FROM seller_applications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`, [req.user.id]
    );
    return res.json({ application: result.rows[0] || null });
  } catch (error) { return next(error); }
});

router.post('/application', async (req, res, next) => {
  try {
    if (req.user.role !== 'buyer') return res.status(409).json({ error: 'seller_application_not_allowed_for_role' });
    const displayName = normalizeText(req.body?.displayName, 120);
    const legalName = normalizeText(req.body?.legalName, 200);
    const countryCode = normalizeText(req.body?.countryCode, 2).toUpperCase();
    const message = normalizeText(req.body?.message, 1000) || null;
    if (!displayName || !legalName) return res.status(400).json({ error: 'display_name_and_legal_name_required' });
    if (!/^[A-Z]{2}$/.test(countryCode)) return res.status(400).json({ error: 'invalid_country_code' });

    const result = await query(
      `INSERT INTO seller_applications (user_id, display_name, legal_name, country_code, message)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, status,
                 display_name AS "displayName",
                 legal_name AS "legalName",
                 country_code AS "countryCode",
                 message,
                 review_note AS "reviewNote",
                 submitted_at AS "submittedAt",
                 reviewed_at AS "reviewedAt",
                 reviewed_by AS "reviewedBy",
                 created_at AS "createdAt",
                 updated_at AS "updatedAt"`,
      [req.user.id, displayName, legalName, countryCode, message]
    );
    return res.status(201).json({ application: result.rows[0] });
  } catch (error) {
    if (error?.code === '23505') return res.status(409).json({ error: 'seller_application_already_active' });
    return next(error);
  }
});

router.post('/application/withdraw', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE seller_applications SET status = 'withdrawn', updated_at = NOW()
        WHERE user_id = $1 AND status IN ('pending','under_review')
        RETURNING id, status, updated_at AS "updatedAt"`, [req.user.id]
    );
    if (!result.rowCount) return res.status(409).json({ error: 'no_active_seller_application' });
    return res.json({ application: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;