import { query } from './db.js';

const MAX_LIMIT = 50;

export async function listCatalog({ locale = 'en', category = null, search = '', page = 1, limit = 24 }) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Number.parseInt(limit, 10) || 24));
  const offset = (safePage - 1) * safeLimit;
  const searchTerm = search.trim();

  const result = await query(
    `SELECT
       p.id,
       p.price_amount,
       p.price_currency,
       p.streaming_enabled,
       p.download_enabled,
       p.published_at,
       CASE WHEN thumbnail.image_id IS NOT NULL
         THEN '/api/catalog/products/' || p.id::text || '/images/' || thumbnail.image_id::text
         ELSE NULL
       END AS thumbnail_url,
       c.slug AS category,
       sp.user_id AS seller_id,
       sp.display_name AS seller,
       COALESCE(pt.title, fallback.title, p.title) AS title,
       COALESCE(pt.description, fallback.description, p.description) AS description
     FROM products p
     JOIN seller_profiles sp ON sp.user_id = p.seller_id
     JOIN users su ON su.id = p.seller_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN LATERAL (
       SELECT pi.media_asset_id AS image_id
         FROM product_images pi
         JOIN media_assets ma ON ma.id = pi.media_asset_id
        WHERE pi.product_id = p.id
          AND pi.image_role = 'thumbnail'
          AND ma.status = 'ready'
          AND ma.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
        ORDER BY CASE WHEN pi.image_role = 'thumbnail' THEN 0 ELSE 1 END,
                 pi.sort_order ASC, pi.id ASC
        LIMIT 1
     ) thumbnail ON TRUE
     LEFT JOIN product_translations pt
       ON pt.product_id = p.id AND pt.locale = $1
     LEFT JOIN LATERAL (
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
       )
       AND ($2 = '' OR c.slug = $2)
       AND ($3 = '' OR COALESCE(pt.title, fallback.title, p.title) ILIKE '%' || $3 || '%'
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