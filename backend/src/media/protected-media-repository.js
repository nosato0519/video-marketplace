import { query } from '../db.js';

export async function getProtectedMediaContext({ userId, productId, assetId }) {
  const result = await query(
    `SELECT
       e.id AS entitlement_id,
       e.user_id,
       e.product_id,
       e.status AS entitlement_status,
       p.status AS product_status,
       m.id AS asset_id,
       m.storage_key,
       m.mime_type,
       m.byte_size,
       m.status AS asset_status,
       EXISTS (
         SELECT 1 FROM content_reviews cr
          WHERE cr.product_id = p.id AND cr.status = 'blocked'
       ) AS content_blocked
       FROM entitlements e
       JOIN products p ON p.id = e.product_id
       JOIN media_assets m ON m.id = p.media_asset_id
      WHERE e.user_id = $1
        AND e.product_id = $2
        AND ($3::uuid IS NULL OR m.id = $3::uuid)
      LIMIT 1`,
    [userId, productId, assetId || null]
  );

  if (!result.rows.length) return null;
  const row = result.rows[0];

  return {
    entitlement: {
      id: row.entitlement_id,
      user_id: row.user_id,
      product_id: row.product_id,
      status: row.entitlement_status,
    },
    product: {
      id: row.product_id,
      status: row.product_status,
      content_blocked: row.content_blocked,
      moderation_status: row.content_blocked ? 'blocked' : null,
      media_asset_id: row.asset_id,
    },
    asset: {
      id: row.asset_id,
      storage_key: row.storage_key,
      mime_type: row.mime_type,
      byte_size: Number(row.byte_size),
      status: row.asset_status,
    },
  };
}

// Backwards-compatible name used by the protected-media route and its tests.
export const getProtectedMediaForUser = getProtectedMediaContext;
