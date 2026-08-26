import { query } from '../db.js';

export async function listProductTranslations({ productId }) {
  const result = await query(
    `SELECT pt.product_id, pt.locale, sl.language_name, sl.native_name,
            pt.title, pt.description, pt.created_at, pt.updated_at
       FROM product_translations pt
       JOIN supported_locales sl ON sl.locale = pt.locale
      WHERE pt.product_id = $1
      ORDER BY sl.is_default DESC, sl.language_name ASC`,
    [productId]
  );
  return result.rows;
}

export async function upsertProductTranslation({ productId, locale, title, description = '' }) {
  if (!productId || !locale || !title?.trim()) throw new Error('translation_fields_required');

  const result = await query(
    `INSERT INTO product_translations (product_id, locale, title, description)
     SELECT $1, sl.locale, $3, $4
       FROM supported_locales sl
      WHERE sl.locale = $2 AND sl.enabled = TRUE
     ON CONFLICT (product_id, locale)
     DO UPDATE SET title = EXCLUDED.title,
                   description = EXCLUDED.description,
                   updated_at = NOW()
     RETURNING product_id, locale, title, description, updated_at`,
    [productId, locale, title.trim(), description.trim()]
  );

  if (!result.rows[0]) throw new Error('locale_not_enabled');
  return result.rows[0];
}

export async function deleteProductTranslation({ productId, locale }) {
  const result = await query(
    `DELETE FROM product_translations
      WHERE product_id = $1 AND locale = $2
      RETURNING product_id, locale`,
    [productId, locale]
  );
  return result.rows[0] ?? null;
}
