import express from 'express';
import { query } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const ALLOWED_METHODS = new Set(['none', 'document']);

router.get('/settings/seller-verification', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT setting_value->>\'value\' AS method FROM platform_settings WHERE setting_key = \'seller_verification_method\' LIMIT 1'
    );
    const method = result.rows[0]?.method || 'document';
    return res.json({ method });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings/seller-verification', async (req, res, next) => {
  try {
    const method = String(req.body?.method || '').trim();
    if (!ALLOWED_METHODS.has(method)) return res.status(400).json({ error: 'invalid_seller_verification_method' });
    const result = await query(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
       VALUES ('seller_verification_method', jsonb_build_object('value', $1), NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
       RETURNING setting_value->>'value' AS method`,
      [method]
    );
    return res.json({ method: result.rows[0].method });
  } catch (error) {
    return next(error);
  }
});

export default router;