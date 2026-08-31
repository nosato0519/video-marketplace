import { query } from './db.js';

const MAX_LIMIT = 50;

const catalogSelect = `
  SELECT
    p.id,
    p.price_amount,
    p.price_currency,
    p.streaming_enabled,
    p.download_enabled,
    p.published_at,
    c.slug AS category,
    sp.user_id AS seller_id,
    sp.display_name AS seller,
    COALESCE(pt.title, fallback.title) AS title,
    COALESCE(pt.description, fallback.description) AS description
  FROM products p
  JOIN seller_profiles sp ON sp.user_id = p.seller_id
  JOIN users su ON su.id = p.seller_id
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN product_translations pt
    ON pt.product_id = p.id AND pt.locale = $1
  JOIN LATERAL (
    SELECT title, description
    FROM product_translations
    WHERE product_id = p.id
    ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END
    LIMIT 1
  ) fallback ON TRUE
  WHERE p.status = 'published'
    AND su.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM content_reviews cr
       WHERE cr.product_id = p.id AND cr.status = 'blocked'
    )`;

export async function listCatalog({ locale = 'en', category = null, search = '', page = 1, limit = 24 }) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || 24));
  const offset = (safePage - 1) * safeLimit;
  const searchTerm = search.trim();

  const result = await query(
    `${catalogSelect}
     AND ($2 = '' OR c.slug = $2)
     AND ($3 = '' OR COALESCE(pt.title, fallback.title) ILIKE '%' || $3 || '%'
          OR sp.display_name ILIKE '%' || $3 || '%')
     ORDER BY p.published_at DESC NULLS LAST, p.id DESC
     LIMIT $4 OFFSET $5`,
    [locale, category || '', searchTerm, safeLimit, offset]
  );

  return {
    data: result.rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      returned: result.rows.length,
      hasMore: result.rows.length === safeLimit
    }
  };
}

export async function getCatalogProduct({ id, locale = 'en' }) {
  const result = await query(
    `${catalogSelect}
     AND p.id = $2
     LIMIT 1`,
    [locale, id]
  );

  return result.rows[0] || null;
}
