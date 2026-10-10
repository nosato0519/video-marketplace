import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const ALLOWED_METHODS = new Set(['none', 'email', 'document']);

router.get('/settings/seller-verification', async (_req, res, next) => {
  try {
    const result = await query(
      `SELECT setting_key, setting_value
         FROM platform_settings
        WHERE setting_key IN ('seller_verification_method', 'operator_email')`
    );
    const settings = Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value]));
    const configuredMethod = settings.seller_verification_method?.value;
    const method = ALLOWED_METHODS.has(configuredMethod) ? configuredMethod : 'none';
    return res.json({
      method,
      operatorEmail: String(settings.operator_email?.value || ''),
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings/seller-verification', async (req, res, next) => {
  try {
    const method = String(req.body?.method || '').trim();
    const operatorEmail = String(req.body?.operatorEmail || '').trim().toLowerCase();
    if (!ALLOWED_METHODS.has(method)) return res.status(400).json({ error: 'invalid_seller_verification_method' });
    if (operatorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(operatorEmail)) {
      return res.status(400).json({ error: 'invalid_operator_email' });
    }
    if (method === 'email' && !operatorEmail) {
      return res.status(400).json({ error: 'operator_email_required_for_email_verification' });
    }
    const values = [
      ['seller_verification_method', method],
      ['operator_email', operatorEmail],
    ];
    await withTransaction(async (db) => {
      for (const [key, value] of values) {
        await db.query(
          `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
           VALUES ($1::text, jsonb_build_object('value', $2::text), NOW())
           ON CONFLICT (setting_key)
           DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
          [key, value]
        );
      }
    });
    return res.json({ method, operatorEmail });
  } catch (error) {
    console.error('Saving seller verification setting failed', error);
    return res.status(500).json({
      error: {
        code: 'SELLER_VERIFICATION_SETTINGS_SAVE_FAILED',
        diagnosticCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
      },
    });
  }
});

export default router;