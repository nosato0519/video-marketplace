import { requireAuth } from './auth/require-auth.js';
import { query } from './db.js';

export function registerLibraryRoutes(app) {
  app.get('/api/library', requireAuth, async (req, res, next) => {
    try {
      // Remove stale active grants left attached to orders that are no longer paid.
      // Otherwise the partial unique user/product index can block a new paid order's grant.
      await query(
        `UPDATE entitlements e
            SET status = 'revoked', revoked_at = COALESCE(e.revoked_at, NOW())
          WHERE e.user_id = $1
            AND e.status = 'active'
            AND NOT EXISTS (
              SELECT 1
                FROM orders o
               WHERE o.id = e.order_id
                 AND o.buyer_id = e.user_id
                 AND o.product_id = e.product_id
                 AND o.status = 'paid'
            )`,
        [req.user.id]
      );

      // Restore a missing/revoked grant for a paid order if no valid grant exists.
      await query(
        `UPDATE entitlements e
            SET status = 'active', revoked_at = NULL
          WHERE e.user_id = $1
            AND e.status = 'revoked'
            AND EXISTS (
              SELECT 1
                FROM orders o
               WHERE o.id = e.order_id
                 AND o.buyer_id = e.user_id
                 AND o.product_id = e.product_id
                 AND o.status = 'paid'
            )
            AND NOT EXISTS (
              SELECT 1
                FROM entitlements active
               WHERE active.user_id = e.user_id
                 AND active.product_id = e.product_id
                 AND active.status = 'active'
            )`,
        [req.user.id]
      );

      // Backfill grants only when the paid order has no entitlement row yet.
      await query(
        `INSERT INTO entitlements (user_id, product_id, order_id)
         SELECT o.buyer_id, o.product_id, o.id
           FROM orders o
          WHERE o.buyer_id = $1
            AND o.status = 'paid'
            AND NOT EXISTS (
              SELECT 1
                FROM entitlements existing
               WHERE existing.order_id = o.id
            )
            AND NOT EXISTS (
              SELECT 1
                FROM entitlements active
               WHERE active.user_id = o.buyer_id
                 AND active.product_id = o.product_id
                 AND active.status = 'active'
            )
         ON CONFLICT DO NOTHING`,
        [req.user.id]
      );

      const result = await query(
        `SELECT e.id AS entitlement_id,
                o.product_id,
                o.id AS order_id,
                e.status AS entitlement_status,
                COALESCE(translation.title, p.title) AS title,
                COALESCE(translation.description, p.description) AS description,
                p.price_amount,
                p.price_currency,
                p.streaming_enabled,
                p.download_enabled,
                p.media_asset_id,
                m.status AS media_status,
                m.mime_type AS media_mime_type,
                m.byte_size AS media_byte_size,
                CASE WHEN thumbnail.media_asset_id IS NOT NULL
                  THEN '/api/catalog/products/' || p.id::text || '/images/' || thumbnail.media_asset_id::text
                  ELSE NULL
                END AS thumbnail_url,
                e.created_at AS purchased_at
           FROM entitlements e
           JOIN orders o
             ON o.id = e.order_id
            AND o.buyer_id = e.user_id
            AND o.product_id = e.product_id
            AND o.status = 'paid'
           JOIN products p ON p.id = o.product_id
           LEFT JOIN media_assets m ON m.id = p.media_asset_id
           LEFT JOIN LATERAL (
             SELECT pi.media_asset_id
               FROM product_images pi
               JOIN media_assets image_asset ON image_asset.id = pi.media_asset_id
              WHERE pi.product_id = p.id
                AND pi.image_role = 'thumbnail'
                AND image_asset.status = 'ready'
                AND image_asset.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
              ORDER BY pi.sort_order ASC, pi.id ASC
              LIMIT 1
           ) thumbnail ON TRUE
           LEFT JOIN LATERAL (
             SELECT pt.title, pt.description
               FROM product_translations pt
              WHERE pt.product_id = p.id
              ORDER BY CASE WHEN pt.locale = 'ja' THEN 0 WHEN pt.locale LIKE 'ja-%' THEN 1 WHEN pt.locale = 'en' THEN 2 ELSE 3 END, pt.locale
              LIMIT 1
           ) translation ON TRUE
          WHERE e.user_id = $1
            AND e.status = 'active'
            AND e.revoked_at IS NULL
            AND p.status = 'published'
            AND COALESCE(p.content_blocked, false) = false
            AND COALESCE(p.moderation_status, '') <> 'blocked'
            AND NOT EXISTS (
              SELECT 1
                FROM content_reviews cr
               WHERE cr.product_id = p.id
                 AND cr.status = 'blocked'
            )
          ORDER BY e.created_at DESC`,
        [req.user.id]
      );
      return res.json({ items: result.rows });
    } catch (error) {
      return next(error);
    }
  });
}
