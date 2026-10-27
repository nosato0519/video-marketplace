import express from 'express';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';

const router = express.Router();
router.use(requireAuth, requireRole('admin'));

const ALLOWED_METHODS = new Set(['none', 'email', 'document']);

const HOMEPAGE_SECTIONS_KEY = 'homepage_sections';
const PAGE_EDITOR_CONFIG_KEY = 'page_editor_config';

router.get('/settings/homepage', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1',
      [HOMEPAGE_SECTIONS_KEY]
    );
    return res.json({ sections: result.rows[0]?.setting_value?.value ?? null });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings/homepage', async (req, res, next) => {
  try {
    const sections = req.body?.sections;
    if (!Array.isArray(sections) || sections.length > 100 ||
        sections.some((item) => !item || typeof item !== 'object' ||
          typeof item.id !== 'string' || typeof item.type !== 'string' ||
          typeof item.label !== 'string' || typeof item.hidden !== 'boolean')) {
      return res.status(400).json({ error: 'invalid_homepage_sections' });
    }
    await query(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [HOMEPAGE_SECTIONS_KEY, JSON.stringify({ value: sections })]
    );
    return res.json({ sections });
  } catch (error) {
    return next(error);
  }
});


router.get('/settings/page-editor', async (_req, res, next) => {
  try {
    const result = await query(
      'SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1',
      [PAGE_EDITOR_CONFIG_KEY]
    );
    return res.json({ entries: result.rows[0]?.setting_value?.value?.entries ?? null });
  } catch (error) {
    return next(error);
  }
});

router.put('/settings/page-editor', async (req, res, next) => {
  try {
    const entries = req.body?.entries;
    if (!entries || typeof entries !== 'object' || Array.isArray(entries) ||
        Object.keys(entries).length > 250 ||
        Object.entries(entries).some(([key, value]) =>
          (!['vm-demo-pages', 'vm-demo-homepage-sections', 'vm-demo-site-chrome', 'vm-demo-site-branding', 'vm-demo-admin-setting-general', 'vm-demo-announcements', 'vm-demo-homepage-theme'].includes(key) &&
           !/^vm-demo-page-(sections|theme|meta|design|chrome)-[a-zA-Z0-9_-]+$/.test(key)) ||
          typeof value !== 'string' || value.length > 1000000)) {
      return res.status(400).json({ error: 'invalid_page_editor_config' });
    }
    if (typeof entries['vm-demo-pages'] === 'string') {
      let savedPages;
      try { savedPages = JSON.parse(entries['vm-demo-pages']); } catch (_) {
        return res.status(400).json({ error: 'invalid_page_list' });
      }
      if (!Array.isArray(savedPages)) return res.status(400).json({ error: 'invalid_page_list' });
      const publicRoot = path.resolve(process.cwd());
      for (const page of savedPages) {
        if (!page || page.status !== '公開' || typeof page.url !== 'string') continue;
        const url = page.url.trim();
        if (!/^\/(?!\/)[a-zA-Z0-9._/-]*$/.test(url) || url === '/' || url === '/api' || url.startsWith('/api/') || url.split('/').includes('..')) {
          return res.status(400).json({ error: 'invalid_published_page_url' });
        }
        const filePath = path.resolve(publicRoot, '.' + url);
        if (!filePath.startsWith(publicRoot + path.sep) || existsSync(filePath)) {
          return res.status(409).json({ error: 'page_url_conflicts_with_existing_file', url });
        }
      }
    }
    let persistedEntries = entries;
    if (req.body?.merge === true) {
      const current = await query('SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1', [PAGE_EDITOR_CONFIG_KEY]);
      const existingEntries = current.rows[0]?.setting_value?.value?.entries;
      persistedEntries = { ...(existingEntries && typeof existingEntries === 'object' ? existingEntries : {}), ...entries };
    }
    const serialized = JSON.stringify({ entries: persistedEntries });
    if (Buffer.byteLength(serialized, 'utf8') > 900000) return res.status(413).json({ error: 'page_editor_config_too_large' });
    await query(`INSERT INTO platform_settings (setting_key, setting_value, updated_at) VALUES ($1, $2::jsonb, NOW()) ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [PAGE_EDITOR_CONFIG_KEY, JSON.stringify({ value: { entries: persistedEntries } })]);
    return res.json({ saved: true, keys: Object.keys(entries) });
  } catch (error) {
    return next(error);
  }
});

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