import express from 'express';
import { query } from '../db.js';
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
        WHERE setting_key IN ('seller_verification_method', 'operator_email', 'seller_verification_email_subject', 'seller_verification_email_body')`
    );
    const settings = Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value]));
    const configuredMethod = settings.seller_verification_method?.value;
    const method = ALLOWED_METHODS.has(configuredMethod) ? configuredMethod : 'none';
    return res.json({
      method,
      operatorEmail: String(settings.operator_email?.value || ''),
      emailSubject: String(settings.seller_verification_email_subject?.value || '販売者登録の承認と本人確認について | VIDEO MARKETPLACE'),
      emailBody: String(settings.seller_verification_email_body?.value || '販売者登録が承認されました。本人確認が必要な場合は、本人確認書類を運営者メールアドレス（{operatorEmail}）へ送信するか、本人確認ページ（{verificationUrl}）から提出してください。'),
    });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings/seller-verification', async (req, res, next) => {
  try {
    const method = String(req.body?.method || '').trim();
    const operatorEmail = String(req.body?.operatorEmail || '').trim().toLowerCase();
    const emailSubject = String(req.body?.emailSubject || '').trim().slice(0, 200);
    const emailBody = String(req.body?.emailBody || '').trim().slice(0, 5000);
    if (!ALLOWED_METHODS.has(method)) return res.status(400).json({ error: 'invalid_seller_verification_method' });
    if (operatorEmail && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(operatorEmail)) {
      return res.status(400).json({ error: 'invalid_operator_email' });
    }
    if (method === 'email' && !operatorEmail) {
      return res.status(400).json({ error: 'operator_email_required_for_email_verification' });
    }
    if (!emailSubject || !emailBody) return res.status(400).json({ error: 'verification_email_template_required' });
    const values = [
      ['seller_verification_method', method],
      ['operator_email', operatorEmail],
      ['seller_verification_email_subject', emailSubject],
      ['seller_verification_email_body', emailBody],
    ];
    for (const [key, value] of values) {
      await query(
        `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
         VALUES ($1, jsonb_build_object('value', $2::text), NOW())
         ON CONFLICT (setting_key)
         DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
        [key, value]
      );
    }
    return res.json({ method, operatorEmail, emailSubject, emailBody });
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