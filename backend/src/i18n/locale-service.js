import { query } from '../db.js';
import { DEFAULT_LOCALE, resolveLocale } from './locale-policy.js';

export async function listEnabledLocales() {
  const result = await query(
    `SELECT locale, language_name, native_name, is_default
       FROM supported_locales
      WHERE enabled = TRUE
      ORDER BY is_default DESC, language_name ASC`
  );
  return result.rows;
}

export async function getDefaultLocale() {
  const result = await query(
    `SELECT locale
       FROM supported_locales
      WHERE enabled = TRUE AND is_default = TRUE
      LIMIT 1`
  );
  return result.rows[0]?.locale || DEFAULT_LOCALE;
}

export async function resolveConfiguredLocale(requested) {
  const locales = await listEnabledLocales();
  const supported = locales.map((item) => item.locale);
  return resolveLocale(requested, supported.length ? supported : [DEFAULT_LOCALE]);
}
