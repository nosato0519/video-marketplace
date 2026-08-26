import { query } from '../db.js';

export async function listLocalesForAdmin() {
  const result = await query(
    `SELECT locale, language_name, native_name, enabled, is_default, created_at
       FROM supported_locales
      ORDER BY is_default DESC, language_name ASC`
  );
  return result.rows;
}

export async function createOrEnableLocale({ locale, languageName, nativeName }) {
  if (!locale || !languageName || !nativeName) throw new Error('locale_fields_required');

  const result = await query(
    `INSERT INTO supported_locales (locale, language_name, native_name, enabled)
     VALUES ($1, $2, $3, TRUE)
     ON CONFLICT (locale)
     DO UPDATE SET
       language_name = EXCLUDED.language_name,
       native_name = EXCLUDED.native_name,
       enabled = TRUE
     RETURNING locale, language_name, native_name, enabled, is_default`,
    [locale, languageName, nativeName]
  );
  return result.rows[0];
}

export async function setLocaleEnabled({ locale, enabled }) {
  if (!locale) throw new Error('locale_required');

  if (!enabled) {
    const result = await query(
      `UPDATE supported_locales
          SET enabled = FALSE
        WHERE locale = $1 AND is_default = FALSE
      RETURNING locale, enabled`,
      [locale]
    );
    if (!result.rows[0]) throw new Error('default_locale_cannot_be_disabled');
    return result.rows[0];
  }

  const result = await query(
    `UPDATE supported_locales
        SET enabled = TRUE
      WHERE locale = $1
    RETURNING locale, enabled`,
    [locale]
  );
  if (!result.rows[0]) throw new Error('locale_not_found');
  return result.rows[0];
}
