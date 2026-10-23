import { query } from '../db.js';

export async function getOrderHistory(userId) {
  if (!userId) return [];

  const result = await query(
    `SELECT o.id,
            o.status,
            o.amount,
            o.currency,
            o.created_at,
            o.paid_at,
            o.refunded_at,
            o.product_id,
            COALESCE(translation.title, p.title) AS title,
            CASE WHEN thumbnail.media_asset_id IS NOT NULL
              THEN '/api/catalog/products/' || p.id::text || '/images/' || thumbnail.media_asset_id::text
              ELSE NULL
            END AS thumbnail_url
       FROM orders o
       JOIN products p ON p.id = o.product_id
       LEFT JOIN LATERAL (
         SELECT pt.title
           FROM product_translations pt
          WHERE pt.product_id = p.id
          ORDER BY CASE WHEN pt.locale = 'ja' THEN 0 WHEN pt.locale LIKE 'ja-%' THEN 1 WHEN pt.locale = 'en' THEN 2 ELSE 3 END, pt.locale
          LIMIT 1
       ) translation ON TRUE
       LEFT JOIN LATERAL (
         SELECT pi.media_asset_id
           FROM product_images pi
           JOIN media_assets image_asset ON image_asset.id = pi.media_asset_id
          WHERE pi.product_id = p.id
            AND pi.image_role = 'thumbnail'
            AND image_asset.status = 'ready'
            AND image_asset.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
          ORDER BY CASE WHEN pi.image_role = 'thumbnail' THEN 0 ELSE 1 END,
                   pi.sort_order ASC,
                   pi.id ASC
          LIMIT 1
       ) thumbnail ON TRUE
      WHERE o.buyer_id = $1
      ORDER BY o.created_at DESC`,
    [userId]
  );

  return result.rows.map((order) => ({
    orderId: order.id,
    productId: order.product_id,
    title: order.title,
    thumbnailUrl: order.thumbnail_url,
    amount: order.amount,
    currency: order.currency,
    status: order.status,
    createdAt: order.created_at,
    paidAt: order.paid_at ?? null,
    refundedAt: order.refunded_at ?? null,
  }));
}
