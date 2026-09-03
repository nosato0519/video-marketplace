import { requireAuth } from './auth/require-auth.js';
import { query } from './db.js';

export function registerLibraryRoutes(app) {
  app.get('/api/library', requireAuth, async (req, res, next) => {
    try {
      const result = await query(
        `SELECT e.id AS entitlement_id,
                e.product_id,
                e.order_id,
                e.status AS entitlement_status,
                translation.title,
                translation.description,
                p.price_amount,
                p.price_currency,
                p.streaming_enabled,
                p.download_enabled,
                e.created_at AS purchased_at
           FROM entitlements e
           JOIN products p ON p.id = e.product_id
           LEFT JOIN LATERAL (
             SELECT pt.title, pt.description
               FROM product_translations pt
              WHERE pt.product_id = p.id
              ORDER BY CASE WHEN pt.locale = 'en' THEN 0 ELSE 1 END, pt.locale
              LIMIT 1
           ) translation ON TRUE
          WHERE e.user_id = $1
            AND e.status = 'active'
            AND e.revoked_at IS NULL
            AND p.status = 'published'
            AND NOT EXISTS (
              SELECT 1
                FROM content_reviews cr
               WHERE cr.product_id = p.id
                 AND cr.status = 'blocked'
            )
          ORDER BY e.created_at DESC`,
        [req.user.id]
      );
      res.json({ items: result.rows });
    } catch (error) { next(error); }
  });
}
