import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';

const router = express.Router();
router.use(requireAuth);

router.get('/application', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, status, display_name, legal_name, country_code, message,
              review_note, submitted_at, reviewed_at, reviewed_by, created_at, updated_at
         FROM seller_applications
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 1`,
      [req.user.id]
    );
    return res.json({ application: result.rows[0] || null });
  } catch (error) { return next(error); }
});

export default router;
