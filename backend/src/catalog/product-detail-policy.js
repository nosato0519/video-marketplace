import { query } from '../db.js';

export async function getPublicProductDetail({ productId, locale = 'en' }) {
  if (!productId) throw new Error('product_required');

  const result = await query(
    `SELECT
       p.id,
       p.seller_id,
       p.price_amount,
       p.price_currency,
       p.streaming_enabled,
       p.download_enabled,
       p.download_limit,
       p.download_expiry_seconds,
       p.published_at,
       c.slug AS category,
       sp.display_name AS seller,
       COALESCE(pt.title, fallback.title) AS title,
       COALESCE(pt.description, fallback.description) AS description
     FROM products p
     JOIN seller_profiles sp ON sp.id = p.seller_id
     LEFT JOIN categories c ON c.id = p.category_id
     LEFT JOIN product_translations pt
       ON pt.product_id = p.id AND pt.locale = $2
     JOIN LATERAL (
       SELECT title, description
       FROM product_translations
       WHERE product_id = p.id
       ORDER BY CASE WHEN locale = 'en' THEN 0 ELSE 1 END
       LIMIT 1
     ) fallback ON TRUE
     WHERE p.id = $1
       AND p.status = 'published'
       AND sp.status = 'active'
     LIMIT 1`,
    [productId, locale]
  );

  return result.rows[0] ?? null;
}

export function buildProductDetail({ product, seller, viewer }) {
  if (!product || product.status !== 'published') throw new Error('not_found');
  const isOwner = Boolean(viewer && seller && viewer.id === seller.id);
  return {
    id: product.id,
    title: product.title,
    description: product.description,
    priceAmount: product.price_amount,
    priceCurrency: product.price_currency,
    category: product.category,
    publishedAt: product.published_at,
    seller: seller ? { id: seller.id, displayName: seller.display_name } : null,
    viewer: { isOwner },
    purchaseAction: !isOwner,
  };
}

export function validatePurchaseIntent({ user, product }) {
  if (!user) throw new Error('authentication_required');
  if (!product || product.status !== 'published') throw new Error('not_found');
  if (product.seller_id === user.id) throw new Error('seller_cannot_purchase_own_product');
  if (!Number.isFinite(Number(product.price_amount)) || Number(product.price_amount) < 0) {
    throw new Error('invalid_product_price');
  }
  return { productId: product.id };
}
