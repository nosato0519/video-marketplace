import { query } from '../db.js';
import { requireRole } from '../auth/authorize.js';
import { createOrEnableLocale, listLocalesForAdmin, setLocaleEnabled } from './admin-locale-service.js';
import { validateLocaleInput } from './admin-locale-validation.js';

function sameOrigin(req) {
  const origin = req.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).host === req.get('host');
  } catch {
    return false;
  }
}

function requireSameOrigin(req, res, next) {
  if (!sameOrigin(req)) return res.status(403).json({ error: { code: 'CSRF_ORIGIN_REJECTED' } });
  next();
}

async function audit(req, action, locale, metadata = {}) {
  await query(
    `INSERT INTO audit_events (actor_user_id, action, resource_type, metadata)
     VALUES ($1, $2, 'locale', $3::jsonb)`,
    [req.user.id, action, JSON.stringify({ locale, ...metadata })]
  );
}

function handleError(error, res, next) {
  const map = {
    invalid_locale: [400, 'INVALID_LOCALE'],
    locale_names_required: [400, 'LOCALE_NAMES_REQUIRED'],
    locale_field_too_long: [400, 'LOCALE_FIELD_TOO_LONG'],
    default_locale_cannot_be_disabled: [409, 'DEFAULT_LOCALE_CANNOT_BE_DISABLED'],
    locale_not_found: [404, 'LOCALE_NOT_FOUND'],
  };
  const mapped = map[error.message];
  if (mapped) return res.status(mapped[0]).json({ error: { code: mapped[1] } });
  return next(error);
}

export function registerAdminLocaleRoutes(app) {
  const adminOnly = requireRole('admin');

  app.get('/api/admin/locales', adminOnly, async (_req, res, next) => {
    try {
      res.json(await listLocalesForAdmin());
    } catch (error) { next(error); }
  });

  app.post('/api/admin/locales', adminOnly, requireSameOrigin, async (req, res, next) => {
    try {
      const input = validateLocaleInput({
        locale: req.body?.locale,
        languageName: req.body?.languageName,
        nativeName: req.body?.nativeName,
      });
      const locale = await createOrEnableLocale(input);
      await audit(req, 'locale.enabled', locale.locale, { createdOrUpdated: true });
      res.status(201).json(locale);
    } catch (error) { handleError(error, res, next); }
  });

  app.patch('/api/admin/locales/:locale', adminOnly, requireSameOrigin, async (req, res, next) => {
    try {
      if (typeof req.body?.enabled !== 'boolean') throw new Error('invalid_enabled_value');
      const locale = await setLocaleEnabled({ locale: req.params.locale, enabled: req.body.enabled });
      await audit(req, req.body.enabled ? 'locale.enabled' : 'locale.disabled', locale.locale);
      res.json(locale);
    } catch (error) {
      if (error.message === 'invalid_enabled_value') return res.status(400).json({ error: { code: 'INVALID_ENABLED_VALUE' } });
      handleError(error, res, next);
    }
  });
}
