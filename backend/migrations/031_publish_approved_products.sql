UPDATE products p
   SET status = 'published',
       published_at = COALESCE(p.published_at, NOW()),
       updated_at = NOW()
 WHERE p.status = 'approved'
   AND p.moderation_status = 'approved'
   AND p.title IS NOT NULL
   AND BTRIM(p.title) <> ''
   AND p.price_amount > 0
   AND p.price_currency ~ '^[A-Z]{3}$'
   AND EXISTS (
     SELECT 1
       FROM media_assets m
      WHERE m.id = p.media_asset_id
        AND m.owner_user_id = p.seller_id
        AND m.status = 'ready'
        AND m.mime_type LIKE 'video/%'
   )
   AND EXISTS (
     SELECT 1
       FROM users u
      WHERE u.id = p.seller_id
        AND u.status = 'active'
   )
   AND EXISTS (
     SELECT 1
       FROM product_translations pt
      WHERE pt.product_id = p.id
        AND BTRIM(pt.title) <> ''
   )
   AND (
     COALESCE((
       SELECT setting_value->>'value'
         FROM platform_settings
        WHERE setting_key = 'seller_verification_method'
        LIMIT 1
     ), 'none') NOT IN ('email', 'document')
     OR EXISTS (
       SELECT 1
         FROM seller_profiles sp
        WHERE sp.user_id = p.seller_id
          AND sp.verification_status = 'verified'
     )
   );
