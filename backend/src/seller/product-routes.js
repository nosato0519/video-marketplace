import express from 'express';
import { query, withTransaction } from '../db.js';
import { requireAuth } from '../auth/require-auth.js';
import { requireRole } from '../auth/authorize.js';
import { validateProductForPublishing, validateProductThumbnailAssets } from '../catalog/publish-guard.js';

const router = express.Router();
const PRODUCT_IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
router.use(requireAuth, requireRole('seller'));

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

async function getSellerMediaAsset(mediaAssetId, userId, client = { query }) {
  if (!isUuid(mediaAssetId)) return null;
  const result = await client.query(
    'SELECT id, status, mime_type FROM media_assets WHERE id = $1 AND owner_user_id = $2 AND status <> \'deleted\' FOR UPDATE',
    [mediaAssetId, userId]
  );
  return result.rows[0] || null;
}

async function getProductThumbnailValidation(client, productId) {
  const result = await client.query(
    `SELECT ma.status, ma.mime_type
       FROM product_images pi
       JOIN media_assets ma ON ma.id = pi.media_asset_id
      WHERE pi.product_id = $1 AND pi.image_role = 'thumbnail'
      ORDER BY pi.sort_order, pi.id
      FOR UPDATE OF ma`,
    [productId]
  );
  return validateProductThumbnailAssets(result.rows);
}

const PRODUCT_SELECT = `
  SELECT p.id, p.seller_id, p.media_asset_id, p.status, p.moderation_status, p.price_amount, p.price_currency,
         p.title, p.description, p.created_at, p.updated_at, p.published_at,
         c.slug AS category_slug,
         m.status AS media_status, m.mime_type AS media_mime_type, m.byte_size AS media_byte_size,
         m.original_filename AS media_original_filename
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN media_assets m ON m.id = p.media_asset_id
`;

router.get('/products', async (req, res, next) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const perPage = Math.min(50, Math.max(1, Number.parseInt(req.query.per_page, 10) || 10));
    const offset = (page - 1) * perPage;

    const [products, counts] = await Promise.all([
      query(PRODUCT_SELECT + ' WHERE p.seller_id = $1 ORDER BY p.created_at DESC, p.id DESC LIMIT $2 OFFSET $3', [req.user.id, perPage, offset]),
      query(`SELECT
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status = 'published')::int AS published,
               COUNT(*) FILTER (WHERE status IN ('submitted','under_review','processing','approved') OR moderation_status = 'pending')::int AS review,
               COUNT(*) FILTER (WHERE status = 'draft')::int AS draft
             FROM products
            WHERE seller_id = $1`, [req.user.id]),
    ]);

    const totalCount = counts.rows[0]?.total || 0;
    return res.json({
      products: products.rows,
      counts: counts.rows[0],
      pagination: {
        page,
        per_page: perPage,
        total_count: totalCount,
        total_pages: Math.max(1, Math.ceil(totalCount / perPage)),
      },
    });
  } catch (error) { return next(error); }
});

router.get('/products/:productId', async (req, res, next) => {
  if (!isUuid(req.params.productId)) return res.status(404).json({ error: 'product_not_found' });

  try {
    const result = await query(`${PRODUCT_SELECT} WHERE p.id = $1 AND p.seller_id = $2`, [req.params.productId, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'product_not_found' });
    const [translations, images] = await Promise.all([
      query(
        'SELECT locale, title, description FROM product_translations WHERE product_id = $1 ORDER BY locale',
        [req.params.productId]
      ),
      query(
        `SELECT pi.media_asset_id, pi.image_role, pi.sort_order,
                ma.original_filename, ma.mime_type, ma.byte_size
           FROM product_images pi
           JOIN media_assets ma ON ma.id = pi.media_asset_id
          WHERE pi.product_id = $1
          ORDER BY pi.image_role, pi.sort_order, pi.id`,
        [req.params.productId]
      ),
    ]);
    return res.json({ product: { ...result.rows[0], translations: translations.rows, images: images.rows } });
  } catch (error) { return next(error); }
});

router.post('/products', async (req, res, next) => {
  try {
    const {
      title = '',
      description = '',
      priceAmount = 0,
      priceCurrency = 'JPY',
      mediaAssetId = null,
      categorySlug = null,
      translations = [],
      images = [],
    } = req.body || {};
    const normalizedTitle = String(title).trim();
    const normalizedDescription = String(description);
    if (!Array.isArray(translations) || translations.length > 10) return res.status(422).json({ error: 'invalid_product_translations' });
    const normalizedTranslations = new Map([['en', { title: normalizedTitle, description: normalizedDescription }]]);
    for (const translation of translations) {
      const locale = typeof translation?.locale === 'string' ? translation.locale.trim() : '';
      const translatedTitle = typeof translation?.title === 'string' ? translation.title.trim() : '';
      const translatedDescription = typeof translation?.description === 'string' ? translation.description : '';
      if (!['en', 'ja', 'zh-CN', 'zh-TW', 'ko', 'es', 'fr', 'de', 'it', 'pt-BR'].includes(locale)) return res.status(422).json({ error: 'invalid_product_translation_locale' });
      if (!translatedTitle && !translatedDescription) continue;
      if (!translatedTitle) return res.status(422).json({ error: 'product_translation_title_required', locale });
      normalizedTranslations.set(locale, { title: translatedTitle, description: translatedDescription });
    }
    if (!Array.isArray(images) || images.length > 5) {
      return res.status(422).json({ error: 'invalid_product_images' });
    }
    const normalizedImages = images.map((image) => ({
      mediaAssetId: typeof image?.mediaAssetId === 'string' ? image.mediaAssetId.trim() : '',
      role: image?.role === 'thumbnail' ? 'thumbnail' : image?.role === 'gallery' ? 'gallery' : '',
      sortOrder: Number.isSafeInteger(image?.sortOrder) ? image.sortOrder : -1,
    }));
    const hasInvalidImage = normalizedImages.some((image) => (
      !isUuid(image.mediaAssetId)
      || !image.role
      || image.sortOrder < 0
      || image.sortOrder > 4
    ));
    const hasDuplicateImageAsset = new Set(normalizedImages.map((image) => image.mediaAssetId)).size
      !== normalizedImages.length;
    const thumbnailCount = normalizedImages.filter((image) => image.role === 'thumbnail').length;
    const galleryCount = normalizedImages.filter((image) => image.role === 'gallery').length;
    if (hasInvalidImage || hasDuplicateImageAsset || thumbnailCount !== 1 || galleryCount > 4) {
      return res.status(422).json({ error: 'invalid_product_images' });
    }
    const normalizedCategorySlug = categorySlug == null ? '' : String(categorySlug).trim();
    if (normalizedCategorySlug && !/^[a-z0-9-]{1,80}$/.test(normalizedCategorySlug)) return res.status(422).json({ error: 'invalid_product_category' });
    if (!normalizedTitle) return res.status(422).json({ error: 'product_title_required' });
    if (!Number.isSafeInteger(priceAmount) || priceAmount <= 0) {
      return res.status(422).json({ error: 'invalid_product_price' });
    }
    const normalizedCurrency = String(priceCurrency).trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
      return res.status(422).json({ error: 'invalid_product_currency' });
    }
    if (mediaAssetId == null) return res.status(422).json({ error: 'media_asset_required' });
    const creation = await withTransaction(async (client) => {
      const mediaAsset = await getSellerMediaAsset(mediaAssetId, req.user.id, client);
      if (!mediaAsset) return { error: 'product_media_asset_not_owned' };
      if (mediaAsset.status !== 'ready') return { error: 'product_media_asset_not_ready' };
      let categoryId = null;
      if (normalizedCategorySlug) {
        const category = await client.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [normalizedCategorySlug]);
        if (!category.rows.length) return { error: 'product_category_not_found' };
        categoryId = category.rows[0].id;
      }
      for (const image of normalizedImages) {
        const asset = await getSellerMediaAsset(image.mediaAssetId, req.user.id, client);
        if (!asset || asset.status !== 'ready' || !PRODUCT_IMAGE_MIME_TYPES.has(asset.mime_type)) {
          return { error: 'product_image_asset_invalid' };
        }
      }
      const result = await client.query(
        `INSERT INTO products (seller_id, media_asset_id, category_id, status, price_amount, price_currency, title, description)
         VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7)
         RETURNING id, seller_id, media_asset_id, category_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`,
        [req.user.id, mediaAssetId, categoryId, priceAmount, normalizedCurrency, normalizedTitle, normalizedDescription]
      );
      const product = result.rows[0];
      for (const image of normalizedImages) {
        await client.query(
          `INSERT INTO product_images (product_id, media_asset_id, image_role, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [product.id, image.mediaAssetId, image.role, image.sortOrder]
        );
      }
      for (const [locale, content] of normalizedTranslations) {
        await client.query(
          `INSERT INTO product_translations (product_id, locale, title, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (product_id, locale) DO UPDATE
             SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = NOW()`,
          [product.id, locale, content.title, content.description]
        );
      }
      return { product };
    });
    if (creation.error === 'product_media_asset_not_owned') return res.status(422).json({ error: 'media_asset_not_owned' });
    if (creation.error === 'product_media_asset_not_ready') return res.status(422).json({ error: 'media_asset_not_ready' });
    if (creation.error === 'product_category_not_found') return res.status(422).json({ error: 'product_category_not_found' });
    if (creation.error === 'product_image_asset_invalid') return res.status(422).json({ error: 'product_image_asset_invalid' });
    return res.status(201).json({ product: creation.product });
  } catch (error) { return next(error); }
});

router.patch('/products/:productId', async (req, res, next) => {
  if (!isUuid(req.params.productId)) {
    return res.status(404).json({ error: 'product_not_found' });
  }

  try {
    const current = await query('SELECT * FROM products WHERE id = $1 AND seller_id = $2', [req.params.productId, req.user.id]);
    if (!current.rows.length) return res.status(404).json({ error: 'product_not_found' });
    const product = current.rows[0];
    const body = req.body || {};
    const { title, description, priceAmount, priceCurrency, categorySlug, translations, images } = body;
    const hasTranslations = Object.prototype.hasOwnProperty.call(body, 'translations');
    const hasImages = Object.prototype.hasOwnProperty.call(body, 'images');
    if (hasImages && (!Array.isArray(images) || images.length > 5)) {
      return res.status(422).json({ error: 'invalid_product_images' });
    }
    const normalizedImages = hasImages ? images.map((image) => ({
      mediaAssetId: typeof image?.mediaAssetId === 'string' ? image.mediaAssetId.trim() : '',
      role: image?.role === 'thumbnail' ? 'thumbnail' : image?.role === 'gallery' ? 'gallery' : '',
      sortOrder: Number.isSafeInteger(image?.sortOrder) ? image.sortOrder : -1,
    })) : [];
    if (hasImages) {
      const invalidImage = normalizedImages.some((image) => (
        !isUuid(image.mediaAssetId) || !image.role || image.sortOrder < 0 || image.sortOrder > 4
      ));
      const duplicateImage = new Set(normalizedImages.map((image) => image.mediaAssetId)).size !== normalizedImages.length;
      const thumbnails = normalizedImages.filter((image) => image.role === 'thumbnail').length;
      const galleries = normalizedImages.filter((image) => image.role === 'gallery').length;
      if (invalidImage || duplicateImage || thumbnails !== 1 || galleries > 4) {
        return res.status(422).json({ error: 'invalid_product_images' });
      }
    }
    if (hasTranslations && (!Array.isArray(translations) || translations.length > 10)) {
      return res.status(422).json({ error: 'invalid_product_translations' });
    }
    const normalizedTranslations = [];
    if (hasTranslations) {
      for (const translation of translations) {
        const locale = typeof translation?.locale === 'string' ? translation.locale.trim() : '';
        const translatedTitle = typeof translation?.title === 'string' ? translation.title.trim() : '';
        const translatedDescription = typeof translation?.description === 'string' ? translation.description : '';
        if (!['en', 'ja', 'zh-CN', 'zh-TW', 'ko', 'es', 'fr', 'de', 'it', 'pt-BR'].includes(locale)) {
          return res.status(422).json({ error: 'invalid_product_translation_locale' });
        }
        if (!translatedTitle && !translatedDescription) continue;
        if (!translatedTitle) return res.status(422).json({ error: 'product_translation_title_required', locale });
        normalizedTranslations.push({ locale, title: translatedTitle, description: translatedDescription });
      }
    }
    const hasCategorySlug = Object.prototype.hasOwnProperty.call(body, 'categorySlug');
    const normalizedCategorySlug = categorySlug == null ? '' : String(categorySlug).trim();
    if (hasCategorySlug && normalizedCategorySlug && !/^[a-z0-9-]{1,80}$/.test(normalizedCategorySlug)) {
      return res.status(422).json({ error: 'invalid_product_category' });
    }
    const hasMediaAssetId = Object.prototype.hasOwnProperty.call(body, 'mediaAssetId');
    const mediaAssetId = body.mediaAssetId;
    if (product.status === 'published') return res.status(409).json({ error: 'published_product_locked' });
    if (['submitted', 'under_review', 'processing'].includes(product.status)) return res.status(409).json({ error: 'product_under_review_locked' });
    if (title != null && !String(title).trim()) {
      return res.status(422).json({ error: 'product_title_required' });
    }
    if (priceAmount != null && (!Number.isSafeInteger(priceAmount) || priceAmount <= 0)) {
      return res.status(422).json({ error: 'invalid_product_price' });
    }
    const normalizedCurrency = priceCurrency == null ? null : String(priceCurrency).trim().toUpperCase();
    if (normalizedCurrency != null && !/^[A-Z]{3}$/.test(normalizedCurrency)) {
      return res.status(422).json({ error: 'invalid_product_currency' });
    }
    const update = await withTransaction(async (client) => {
      const lockedProduct = await client.query(
        'SELECT status FROM products WHERE id = $1 AND seller_id = $2 FOR UPDATE',
        [req.params.productId, req.user.id]
      );
      if (!lockedProduct.rows.length) return { error: 'product_not_found' };
      if (lockedProduct.rows[0].status === 'published') return { error: 'published_product_locked' };
      if (['submitted', 'under_review', 'processing'].includes(lockedProduct.rows[0].status)) return { error: 'product_under_review_locked' };
      let categoryId = null;
      if (hasCategorySlug && normalizedCategorySlug) {
        const category = await client.query('SELECT id FROM categories WHERE slug = $1 LIMIT 1', [normalizedCategorySlug]);
        if (!category.rows.length) return { error: 'product_category_not_found' };
        categoryId = category.rows[0].id;
      }
      if (hasMediaAssetId && mediaAssetId != null) {
        const mediaAsset = await getSellerMediaAsset(mediaAssetId, req.user.id, client);
        if (!mediaAsset) return { error: 'product_media_asset_not_owned' };
        if (mediaAsset.status !== 'ready') return { error: 'product_media_asset_not_ready' };
      }
      if (hasImages) {
        for (const image of normalizedImages) {
          const asset = await getSellerMediaAsset(image.mediaAssetId, req.user.id, client);
          if (!asset || asset.status !== 'ready' || !PRODUCT_IMAGE_MIME_TYPES.has(asset.mime_type)) {
            return { error: 'product_image_asset_invalid' };
          }
        }
      }
      const result = await client.query(`UPDATE products SET title = COALESCE($2, title), description = COALESCE($3, description), price_amount = COALESCE($4, price_amount), price_currency = COALESCE($5, price_currency), media_asset_id = CASE WHEN $6 THEN $7 ELSE media_asset_id END, category_id = CASE WHEN $8 THEN $9 ELSE category_id END, status = CASE WHEN status = 'approved' THEN 'draft' ELSE status END, moderation_status = CASE WHEN status = 'approved' THEN 'changes_requested' ELSE moderation_status END, published_at = NULL, updated_at = NOW() WHERE id = $1 AND seller_id = $10 RETURNING id, seller_id, media_asset_id, category_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.params.productId, title == null ? null : String(title).trim(), description == null ? null : String(description), priceAmount == null ? null : priceAmount, normalizedCurrency, hasMediaAssetId, mediaAssetId == null ? null : mediaAssetId, hasCategorySlug, categoryId, req.user.id]);
      if (hasTranslations) {
        for (const translation of normalizedTranslations) {
          await client.query(
            `INSERT INTO product_translations (product_id, locale, title, description)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (product_id, locale) DO UPDATE
               SET title = EXCLUDED.title, description = EXCLUDED.description, updated_at = NOW()`,
            [req.params.productId, translation.locale, translation.title, translation.description]
          );
        }
        const suppliedLocales = normalizedTranslations.map((translation) => translation.locale);
        if (suppliedLocales.length) {
          await client.query('DELETE FROM product_translations WHERE product_id = $1 AND NOT (locale = ANY($2::text[]))', [req.params.productId, suppliedLocales]);
        } else {
          await client.query('DELETE FROM product_translations WHERE product_id = $1', [req.params.productId]);
        }
      }
      if (hasImages) {
        await client.query('DELETE FROM product_images WHERE product_id = $1', [req.params.productId]);
        for (const image of normalizedImages) {
          await client.query(
            `INSERT INTO product_images (product_id, media_asset_id, image_role, sort_order)
             VALUES ($1, $2, $3, $4)`,
            [req.params.productId, image.mediaAssetId, image.role, image.sortOrder]
          );
        }
      }
      return { product: result.rows[0] };
    });
    if (update.error === 'product_not_found') return res.status(404).json({ error: 'product_not_found' });
    if (update.error === 'published_product_locked') return res.status(409).json({ error: 'published_product_locked' });
    if (update.error === 'product_under_review_locked') return res.status(409).json({ error: 'product_under_review_locked' });
    if (update.error === 'product_media_asset_not_owned') return res.status(422).json({ error: 'media_asset_not_owned' });
    if (update.error === 'product_media_asset_not_ready') return res.status(422).json({ error: 'media_asset_not_ready' });
    if (update.error === 'product_category_not_found') return res.status(422).json({ error: 'product_category_not_found' });
    if (update.error === 'product_image_asset_invalid') return res.status(422).json({ error: 'product_image_asset_invalid' });
    return res.json({ product: update.product });
  } catch (error) { return next(error); }
});

router.delete('/products/:productId', async (req, res, next) => {
  if (!isUuid(req.params.productId)) return res.status(404).json({ error: 'product_not_found' });

  try {
    const deletion = await withTransaction(async (client) => {
      const product = await client.query(
        'SELECT id, status FROM products WHERE id = $1 AND seller_id = $2 FOR UPDATE',
        [req.params.productId, req.user.id]
      );
      if (!product.rows.length) return { error: 'product_not_found' };
      if (product.rows[0].status === 'published') return { error: 'published_product_locked' };
      if (['submitted', 'under_review', 'processing'].includes(product.rows[0].status)) return { error: 'product_under_review_locked' };

      const references = await client.query(
        `SELECT EXISTS (SELECT 1 FROM orders WHERE product_id = $1)
                OR EXISTS (SELECT 1 FROM entitlements WHERE product_id = $1) AS has_purchase_history`,
        [req.params.productId]
      );
      if (references.rows[0]?.has_purchase_history) return { error: 'product_has_purchase_history' };

      await client.query('DELETE FROM products WHERE id = $1 AND seller_id = $2', [req.params.productId, req.user.id]);
      return { deleted: true };
    });

    if (deletion.error === 'product_not_found') return res.status(404).json({ error: 'product_not_found' });
    if (deletion.error === 'published_product_locked') return res.status(409).json({ error: 'published_product_locked' });
    if (deletion.error === 'product_under_review_locked') return res.status(409).json({ error: 'product_under_review_locked' });
    if (deletion.error === 'product_has_purchase_history') return res.status(409).json({ error: 'product_has_purchase_history' });
    return res.status(204).end();
  } catch (error) { return next(error); }
});

router.post('/products/:productId/submit', async (req, res, next) => {
  if (!isUuid(req.params.productId)) return res.status(404).json({ error: 'product_not_found' });

  try {
    const submission = await withTransaction(async (client) => {
      const result = await client.query(
        'SELECT id, title, price_amount, price_currency, media_asset_id, status FROM products WHERE id = $1 AND seller_id = $2 FOR UPDATE',
        [req.params.productId, req.user.id]
      );
      if (!result.rows.length) return { error: 'product_not_found' };
      const product = result.rows[0];
      if (!['draft', 'rejected'].includes(product.status)) return { error: 'product_status_not_submittable' };

      const thumbnailValidation = await getProductThumbnailValidation(client, product.id);
      if (!thumbnailValidation.allowed) return { error: thumbnailValidation.error };

      const mediaResult = product.media_asset_id
        ? await client.query('SELECT id, owner_user_id, status FROM media_assets WHERE id = $1 FOR UPDATE', [product.media_asset_id])
        : { rows: [] };
      const validation = validateProductForPublishing({
        product: { seller_id: req.user.id, title: product.title, price_amount: product.price_amount, price_currency: product.price_currency, media_asset_id: product.media_asset_id },
        mediaAsset: mediaResult.rows[0] || null,
      });
      if (!validation.allowed) return { error: 'product_not_submittable', reasons: validation.errors };

      const review = await client.query(
        "SELECT id FROM content_reviews WHERE product_id = $1 AND status IN ('pending', 'changes_requested') ORDER BY created_at DESC LIMIT 1 FOR UPDATE",
        [product.id]
      );
      if (review.rows.length) {
        await client.query("UPDATE content_reviews SET status = 'pending', reviewer_id = NULL, reason_code = 'seller_resubmission', notes = '', created_at = NOW(), resolved_at = NULL WHERE id = $1", [review.rows[0].id]);
      } else {
        await client.query(
          "INSERT INTO content_reviews (product_id, status, reason_code) VALUES ($1, 'pending', 'seller_submission')",
          [product.id]
        );
      }
      const updated = await client.query(
        "UPDATE products SET status = 'submitted', moderation_status = 'pending', updated_at = NOW() WHERE id = $1 AND seller_id = $2 RETURNING id, status",
        [product.id, req.user.id]
      );
      return { product: updated.rows[0] };
    });
    if (submission.error === 'product_not_found') return res.status(404).json({ error: 'product_not_found' });
    if (submission.error === 'product_status_not_submittable') return res.status(409).json({ error: 'product_status_not_submittable' });
    if (['product_thumbnail_required', 'product_thumbnail_invalid', 'product_thumbnail_not_ready'].includes(submission.error)) return res.status(422).json({ error: submission.error });
    if (submission.error === 'product_not_submittable') return res.status(422).json({ error: submission.error, reasons: submission.reasons });
    return res.json(submission);
  } catch (error) { return next(error); }
});

router.post('/products/:productId/publish', async (req, res, next) => {
  if (!isUuid(req.params.productId)) return res.status(404).json({ error: 'product_not_found' });

  try {
    const verificationSetting = await query(
      `SELECT setting_value->>'value' AS method
         FROM platform_settings
        WHERE setting_key = 'seller_verification_method'
        LIMIT 1`
    );
    const configuredMethod = verificationSetting.rows[0]?.method;
    const verificationMethod = ['email', 'document'].includes(configuredMethod) ? configuredMethod : 'none';
    if (verificationMethod !== 'none') {
      const seller = await query(
        `SELECT verification_status
           FROM seller_profiles
          WHERE user_id = $1`,
        [req.user.id]
      );
      if (seller.rows[0]?.verification_status !== 'verified') {
        return res.status(403).json({ error: 'seller_verification_required' });
      }
    }

    const publication = await withTransaction(async (client) => {
      const productResult = await client.query(
        'SELECT * FROM products WHERE id = $1 AND seller_id = $2 FOR UPDATE',
        [req.params.productId, req.user.id]
      );
      if (!productResult.rows.length) return { error: 'product_not_found' };

      const row = productResult.rows[0];
      const thumbnailValidation = await getProductThumbnailValidation(client, row.id);
      if (!thumbnailValidation.allowed) return { error: 'product_not_publishable', reasons: [thumbnailValidation.error] };
      let mediaAsset = null;
      if (row.media_asset_id) {
        const mediaResult = await client.query(
          'SELECT id, owner_user_id, status FROM media_assets WHERE id = $1 FOR UPDATE',
          [row.media_asset_id]
        );
        if (mediaResult.rows.length) mediaAsset = mediaResult.rows[0];
      }

      const validation = validateProductForPublishing({
        product: { seller_id: row.seller_id, title: row.title, price_amount: row.price_amount, price_currency: row.price_currency, media_asset_id: row.media_asset_id },
        mediaAsset,
      });
      if (!validation.allowed) return { error: 'product_not_publishable', reasons: validation.errors };

      const published = await client.query(
        `UPDATE products SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1 AND seller_id = $2 AND status = 'approved' AND moderation_status = 'approved' RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`,
        [req.params.productId, req.user.id]
      );
      if (!published.rows.length) return { error: 'product_status_not_publishable' };
      return { product: published.rows[0] };
    });
    if (publication.error === 'product_not_found') return res.status(404).json({ error: 'product_not_found' });
    if (publication.error === 'product_not_publishable') return res.status(422).json({ error: publication.error, reasons: publication.reasons });
    if (publication.error === 'product_status_not_publishable') return res.status(409).json({ error: 'product_status_not_publishable' });
    return res.json({ product: publication.product });
  } catch (error) { return next(error); }
});

router.post('/products/:productId/unpublish', async (req, res, next) => {
  if (!isUuid(req.params.productId)) return res.status(404).json({ error: 'published_product_not_found' });

  try {
    const result = await query(`UPDATE products SET status = 'approved', published_at = NULL, updated_at = NOW() WHERE id = $1 AND seller_id = $2 AND status = 'published' AND moderation_status = 'approved' RETURNING id, seller_id, media_asset_id, status, price_amount, price_currency, title, description, created_at, updated_at, published_at`, [req.params.productId, req.user.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'published_product_not_found' });
    return res.json({ product: result.rows[0] });
  } catch (error) { return next(error); }
});

export default router;
