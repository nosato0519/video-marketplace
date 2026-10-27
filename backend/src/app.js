import express from 'express';
import helmet from 'helmet';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { query } from './db.js';
import { registerCatalogRoutes } from './catalog-routes.js';
import { registerProductDetailRoutes } from './catalog/product-detail-routes.js';
import { registerOrderRoutes } from './order-routes.js';
import { registerCheckoutRoutes } from './checkout-routes.js';
import { registerPaymentWebhookRoutes } from './payments/webhook-routes.js';
import { createStripeWebhookHandler } from './payments/stripe-webhook.js';
import { createPayPalWebhookHandler, createPayPalReturnHandler } from './payments/paypal-webhook.js';
import { recordPaymentEvent } from './payments/payment-event-ledger.js';
import { completePayment } from './payments/complete-payment.js';
import { failPayment } from './payments/fail-payment.js';
import { registerConfiguredMediaStreamRoutes } from './media/media-stream-app.js';
import { registerMediaDownloadRoutes } from './media/media-download-route.js';
import { loadSessionUser } from './auth/load-session-user.js';
import { requireRole } from './auth/authorize.js';
import { registerAuthRoutes } from './auth-routes.js';
import { registerAdminLocaleRoutes } from './i18n/admin-locale-routes.js';
import { registerProductTranslationRoutes } from './i18n/product-translation-routes.js';
import { registerLibraryRoutes } from './library-routes.js';
import sellerProductRoutes from './seller/product-routes.js';
import sellerMediaUploadRoutes from './media/media-upload-route.js';
import sellerProfileRoutes from './seller/profile-routes.js';
import sellerEarningsRoutes from './seller/earnings-routes.js';
import sellerPayoutRoutes from './seller/payout-routes.js';
import adminPayoutRoutes from './admin/payout-routes.js';
import adminSellerVerificationRoutes from './admin/seller-verification-routes.js';
import adminSellerApplicationRoutes from './admin/seller-application-routes.js';
import adminBuyerManagementRoutes from './admin/buyer-management-routes.js';
import adminBuyerActivityRoutes from './admin/buyer-activity-routes.js';
import buyerInteractionRoutes from './buyers/interaction-routes.js';
import adminContentModerationRoutes from './admin/content-moderation-routes.js';
import adminSettingsRoutes from './admin/settings-routes.js';
import contentReportRoutes from './content-report-routes.js';
import messageRoutes from './message-routes.js';
import { registerPaymentProviderRoutes } from './payment-provider-routes.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        scriptSrc: ["'self'", "'sha256-ajdE6A2cenTjDNrPNLhA4wX+JDVhqYUwmdZ+XAeEvzw='", "'sha256-qDw4l39SF4IfqsW9/LOnNhVbPJKkDDgjaDVlIRXwNXg='", "'sha256-Bp2Uv73XpLhiWv1YH/fdnhPBpMYXQ2PlykQATyrhfxQ='", "'sha256-KWouYTIvoQePUeMyRJXzOxXU9a80We4XWy2vqlstTtQ='", "'sha256-2C6d878HgVf73Q1bmHgLWVQM8PBLJI0BL+gRmpt1jrY='", "'sha256-pilhapzUq9F7PxaZ1/PjZ2t1wssNS0pXRGr/AfXO64Y='", "'sha256-uTYfMpMSlXglrJLMtOLEZtu9k4uz6Yo3AP1fTHRybSQ='", "'sha256-5ub+UBIbMNCT656KdPUs8h7gS75EKKx/v7asHeVkyJ4='", "'sha256-yVskD44e2ifkJYMm3JWum3e4ITvUWzdf37PNXqpPrf4='", "'sha256-wtZxZvZMyhalC5ZOwWSaDCj+1lNmi/grP+PLH2ceEwg='", "'sha256-n13l739CIljPpwyAbftnS1rBrvzuP6EvEUj9/Bxtf5g='", "'sha256-TBIbd3/UhajGxyDHaHQxfx6rlax5ZOLEPBI5BUKLx4s='", "'sha256-4U9cSjY+sXlh6bN9Le8HdF0222xO+sFlVNdljgpGfIk='", "'sha256-NL8o/rm5R7rJFHnWLduEG1CV4VGI9FSpYMF0bSwEXrA='", "'sha256-zSWp8ZRNwnjFBnPrnXs29rGYYvxjwSzIMmsHHe/59XA='"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com"],
      },
    },
  }));

  registerPaymentWebhookRoutes(app);
  app.post(
    '/api/payments/stripe/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    createStripeWebhookHandler({ recordPaymentEvent, completePayment, failPayment })
  );
  app.post(
    '/api/payments/paypal/webhook',
    express.raw({ type: 'application/json', limit: '1mb' }),
    createPayPalWebhookHandler({ recordPaymentEvent, completePayment, failPayment })
  );

  app.use('/api/seller/profile/verification-document', express.raw({ type: ['image/jpeg', 'image/png', 'application/pdf'], limit: '10mb' }));
  app.use(express.json({ limit: '1mb' }));
  app.use(loadSessionUser);

  const paypalReturnHandler = createPayPalReturnHandler();
  app.get('/api/payments/paypal/return', paypalReturnHandler);


  app.get('/api/site/homepage-settings', async (_req, res) => {
    try {
      const result = await query(
        "SELECT setting_key, setting_value FROM platform_settings WHERE setting_key IN ('homepage_sections', 'page_editor_config')"
      );
      const settings = Object.fromEntries(result.rows.map((row) => [row.setting_key, row.setting_value]));
      const editorEntries = settings.page_editor_config?.value?.entries;
      let publishedPages = [];
      try {
        const savedPages = JSON.parse(editorEntries?.['vm-demo-pages'] || '[]');
        if (Array.isArray(savedPages)) {
          publishedPages = savedPages
            .filter((page) => page && page.status === '公開' &&
              typeof page.name === 'string' && typeof page.url === 'string' && page.url !== '/' && !['/pages/video-list.html', '/pages/categories.html', '/pages/about.html', '/pages/contact.html'].includes(page.url) &&
              /^\/(?!\/)[a-zA-Z0-9._/-]*$/.test(page.url) &&
              !page.url.split('/').includes('..') && !existsSync(path.resolve(process.cwd(), '.' + page.url)))
            .map((page) => {
              let meta = {}, pageSections = [];
              try { meta = JSON.parse(editorEntries?.['vm-demo-page-meta-' + page.id] || '{}') || {}; } catch (_) {}
              try { pageSections = JSON.parse(editorEntries?.['vm-demo-page-sections-' + page.id] || '[]') || []; } catch (_) {}
              const heroImage = typeof meta.hero?.backgroundImage === 'string' ? meta.hero.backgroundImage : '';
              const sectionImage = Array.isArray(pageSections) ? pageSections.find((section) => section && section.hidden !== true && typeof section.content?.image === 'string' && section.content.image.trim())?.content.image : '';
              const itemImage = Array.isArray(pageSections) ? pageSections.flatMap((section) => Array.isArray(section?.items) ? section.items : []).find((item) => typeof item?.image === 'string' && item.image.trim())?.image : '';
              const image = [heroImage, sectionImage, itemImage].find((value) => /^(https?:\/\/|\/(?!\/)|data:image\/webp;base64,[A-Za-z0-9+/=]+$)/.test(value || '')) || '';
              return { id: page.id, name: page.name, url: page.url, image };
            });
        }
      } catch (_) {}
      let editorSections = null;
      let pageSettings = {};
      let siteBranding = {};
      let siteSettings = {};
      let announcements = [];
      let homepageTheme = {};
      const themes = {};
      try {
        const rawBranding = editorEntries?.['vm-demo-site-branding'];
        const rawSiteSettings = editorEntries?.['vm-demo-admin-setting-general'];
        const rawAnnouncements = editorEntries?.['vm-demo-announcements'];
        const rawHomepageTheme = editorEntries?.['vm-demo-homepage-theme'];
        if (typeof rawBranding === 'string') siteBranding = JSON.parse(rawBranding) || {};
        if (typeof rawSiteSettings === 'string') siteSettings = JSON.parse(rawSiteSettings) || {};
        if (typeof rawHomepageTheme === 'string') homepageTheme = JSON.parse(rawHomepageTheme) || {};
        if (typeof rawAnnouncements === 'string') {
          const parsed = JSON.parse(rawAnnouncements);
          if (Array.isArray(parsed)) announcements = parsed.filter(item => item && item.status === 'published' && typeof item.title === 'string').sort((left, right) => String(right.date || '').localeCompare(String(left.date || '')));
        }
      } catch (_) {}
      try {
        const raw = editorEntries?.['vm-demo-homepage-sections'] || editorEntries?.['vm-demo-page-sections-top'];
        if (typeof raw === 'string') editorSections = JSON.parse(raw);
        Object.entries(editorEntries || {}).forEach(([key, value]) => {
          const prefix = 'vm-demo-page-theme-top-';
          if (key.startsWith(prefix) && typeof value === 'string') {
            try { themes[key.slice(prefix.length)] = JSON.parse(value); } catch (_) {}
          }
        });
        for (const [key, storageKey] of [
          ['meta', 'vm-demo-page-meta-top'],
          ['design', 'vm-demo-page-design-top'],
          ['chrome', 'vm-demo-site-chrome']
        ]) {
          const rawSetting = editorEntries?.[storageKey];
          if (typeof rawSetting === 'string') {
            try { pageSettings[key] = JSON.parse(rawSetting); } catch (_) {}
          }
        }
      } catch (_) {}
      const homepageSections = Array.isArray(editorSections) && editorSections.length
        ? editorSections.slice()
        : Array.isArray(settings.homepage_sections?.value)
          ? settings.homepage_sections.value.slice()
          : [];
      publishedPages.forEach((page) => {
        if (!homepageSections.some((section) => section && section.type === 'custom-page' && section.pageId === page.id)) {
          homepageSections.push({
            id: 'custom-page-' + page.id,
            type: 'custom-page',
            pageId: page.id,
            label: page.name,
            hidden: false,
            added: false,
            order: homepageSections.length,
            content: { title: page.name, link: page.url, button: 'ページを見る →' },
          });
        }
      });
      homepageSections.forEach((section, index) => { section.order = index; });
      res.set('Cache-Control', 'no-store');
      return res.json({
        sections: homepageSections,
        publishedPages,
        themes,
        pageSettings,
        siteBranding,
        siteSettings,
        announcements,
        homepageTheme
      });
    } catch (error) {
      console.error('Loading homepage settings failed', error);
      return res.status(500).json({ error: 'homepage_settings_unavailable' });
    }
  });

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'video-marketplace-api', version: '0.1.0', revision: 'paypal-return-route-f47ad9a' });
  });

  app.get('/api/ready', async (_req, res) => {
    try {
      await query('SELECT 1');
      res.json({ status: 'ready', service: 'video-marketplace-api' });
    } catch (error) {
      console.error('Readiness check failed', error);
      res.status(503).json({ status: 'not_ready', service: 'video-marketplace-api' });
    }
  });

  registerAuthRoutes(app);
  registerCatalogRoutes(app);
  registerOrderRoutes(app);
  registerCheckoutRoutes(app);
  registerAdminLocaleRoutes(app);
  registerProductTranslationRoutes(app);
  registerLibraryRoutes(app);
  app.use('/api', contentReportRoutes);
  app.use('/api/messages', messageRoutes);
  app.use('/api/seller', sellerProductRoutes);
  app.use('/api/seller/media', sellerMediaUploadRoutes);
  app.use('/api/seller', sellerProfileRoutes);
  app.use('/api/seller', sellerEarningsRoutes);
  app.use('/api/seller', sellerPayoutRoutes);
  app.use('/api/admin', adminPayoutRoutes);
  app.use('/api/admin', adminSellerVerificationRoutes);
  app.use('/api/admin', adminSellerApplicationRoutes);
  app.use('/api/admin', adminBuyerManagementRoutes);
  app.use('/api/admin', adminBuyerActivityRoutes);
  app.use('/api/buyer', buyerInteractionRoutes);
  app.use('/api/admin', adminContentModerationRoutes);
  app.use('/api/admin', adminSettingsRoutes);
  registerPaymentProviderRoutes(app, { requireAdmin: requireRole('admin') });
  const mediaStorage = registerConfiguredMediaStreamRoutes(app);
  registerProductDetailRoutes(app, { storage: mediaStorage });
  registerMediaDownloadRoutes(app, { storage: mediaStorage });

  const publicRoot = path.resolve(process.cwd());
  app.get('/', (_req, res) => res.sendFile(path.join(publicRoot, 'index.html')));
  app.get('/styles.css', (_req, res) => res.sendFile(path.join(publicRoot, 'styles.css')));
  app.use('/pages', express.static(path.join(publicRoot, 'pages')));
  app.use('/seller', express.static(path.join(publicRoot, 'seller')));
  app.use('/app', express.static(path.join(publicRoot, 'app')));
  app.use('/shared', express.static(path.join(publicRoot, 'shared')));
  app.use('/locales', express.static(path.join(publicRoot, 'locales')));

  app.use(async function publishedPageMiddleware(req, res, next) {
  if (req.method !== 'GET' || req.path === '/' || req.path.startsWith('/api/')) return next();

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const safeUrl = value => {
    const url = String(value || '').trim();
    return /^(https?:\/\/|\/(?!\/))/.test(url) ? url : '';
  };
  const safeImageUrl = value => {
    const url = String(value || '').trim();
    return safeUrl(url) || (/^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(url) ? url : '');
  };
  const parseJson = value => {
    if (typeof value !== 'string') return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  try {
    const result = await query(
      'SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1',
      ['page_editor_config']
    );
    const entries = result.rows[0]?.setting_value?.value?.entries;
    if (!entries || typeof entries !== 'object') return next();

    const pages = parseJson(entries['vm-demo-pages']);
    if (!Array.isArray(pages)) return next();
    const page = pages.find(item => item && item.status === '公開' && item.url === req.path);
    if (!page) return next();

    const id = String(page.id || '');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) return next();

    const sections = parseJson(entries['vm-demo-page-sections-' + id]);
    const meta = parseJson(entries['vm-demo-page-meta-' + id]);
    const design = parseJson(entries['vm-demo-page-design-' + id]);
    const hero = meta.hero && typeof meta.hero === 'object' ? meta.hero : {};
    const visibleSections = (Array.isArray(sections) ? sections : [])
      .filter(section => section && typeof section === 'object' && section.hidden !== true)
      .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));

    const dynamicSectionData = new Map();
    for (const section of visibleSections) {
      if (!['popular', 'new-releases', 'categories'].includes(section.type)) continue;
      const key = String(section.id || section.type);
      const settings = section.settings && typeof section.settings === 'object' ? section.settings : {};
      try {
        if (section.type === 'categories') {
          const categoryCount = Math.min(20, Math.max(1, Number.parseInt(settings.categoryCount, 10) || 12));
          const result = await query(
            `SELECT c.slug, c.name, COUNT(p.id)::int AS product_count
               FROM categories c
               LEFT JOIN products p ON p.category_id = c.id AND p.status = 'published'
              GROUP BY c.id, c.slug, c.name
              ORDER BY c.name ASC
              LIMIT $1`,
            [categoryCount]
          );
          dynamicSectionData.set(key, { categories: result.rows });
          continue;
        }

        const videoCount = Math.min(48, Math.max(1, Number.parseInt(settings.videoCount, 10) || 8));
        const period = section.type === 'popular' && ['week', 'month'].includes(settings.period) ? settings.period : 'all';
        const orderBy = section.type === 'popular'
          ? 'sales_count DESC, p.published_at DESC NULLS LAST, p.id DESC'
          : 'p.published_at DESC NULLS LAST, p.id DESC';
        const result = await query(
          `SELECT
             p.id,
             p.price_amount,
             p.price_currency,
             p.published_at,
             CASE WHEN thumbnail.image_id IS NOT NULL
               THEN '/api/catalog/products/' || p.id::text || '/images/' || thumbnail.image_id::text
               ELSE NULL
             END AS thumbnail_url,
             c.slug AS category,
             sp.display_name AS seller,
             COALESCE(pt.title, fallback.title, p.title) AS title,
             COALESCE(pt.description, fallback.description, p.description) AS description,
             COUNT(o.id)::int AS sales_count
           FROM products p
           JOIN seller_profiles sp ON sp.id = p.seller_id
           JOIN users su ON su.id = sp.user_id
           LEFT JOIN categories c ON c.id = p.category_id
           LEFT JOIN LATERAL (
             SELECT pi.media_asset_id AS image_id
               FROM product_images pi
               JOIN media_assets ma ON ma.id = pi.media_asset_id
              WHERE pi.product_id = p.id
                AND pi.image_role = 'thumbnail'
                AND ma.status = 'ready'
                AND ma.mime_type IN ('image/jpeg', 'image/png', 'image/webp')
              ORDER BY pi.sort_order ASC, pi.id ASC
              LIMIT 1
           ) thumbnail ON TRUE
           LEFT JOIN product_translations pt ON pt.product_id = p.id AND pt.locale = 'ja'
           LEFT JOIN LATERAL (
             SELECT title, description
               FROM product_translations
              WHERE product_id = p.id
              ORDER BY CASE WHEN locale = 'ja' THEN 0 WHEN locale LIKE 'ja-%' THEN 1 WHEN locale = 'en' THEN 2 ELSE 3 END, locale
              LIMIT 1
           ) fallback ON TRUE
           LEFT JOIN orders o
             ON o.product_id = p.id
            AND o.status = 'paid'
            AND ($1::text = 'all'
              OR ($1::text = 'month' AND o.paid_at >= NOW() - INTERVAL '30 days')
              OR ($1::text = 'week' AND o.paid_at >= NOW() - INTERVAL '7 days'))
           WHERE p.status = 'published'
             AND su.status = 'active'
             AND NOT EXISTS (
               SELECT 1 FROM content_reviews cr
                WHERE cr.product_id = p.id AND cr.status = 'blocked'
             )
           GROUP BY p.id, thumbnail.image_id, c.slug, sp.display_name,
                    pt.title, fallback.title, p.title, pt.description, fallback.description, p.description
           ORDER BY ${orderBy}
           LIMIT $2`,
          [period, videoCount]
        );
        dynamicSectionData.set(key, { products: result.rows });
      } catch (error) {
        console.error('Loading published page section failed', { type: section.type, error });
        dynamicSectionData.set(key, section.type === 'categories' ? { categories: [] } : { products: [] });
      }
    }

    const sectionHtml = visibleSections.map(section => {
      const settings = section.settings && typeof section.settings === 'object' ? section.settings : {};
      const content = section.content && typeof section.content === 'object' ? section.content : {};
      const image = safeImageUrl(content.image);
      const theme = parseJson(entries['vm-demo-page-theme-' + id + '-' + String(section.id || section.type || '')]);
      const themeBg = /^#[0-9a-fA-F]{3,8}$/.test(theme.bg || '') ? theme.bg : '';
      const themeText = /^#[0-9a-fA-F]{3,8}$/.test(theme.text || '') ? theme.text : '';
      const themeAccent = /^#[0-9a-fA-F]{3,8}$/.test(theme.accent || '') ? theme.accent : '';
      const themeRadius = theme.radius === 'square' ? '0' : theme.radius === 'rounded' ? '12px' : design.cardShape === 'square' ? '0' : '12px';
      const themeWidth = theme.width === 'wide' ? '1440px' : theme.width === 'narrow' ? '780px' : design.contentWidth === 'wide' ? '1440px' : design.contentWidth === 'narrow' ? '780px' : '1160px';
      const themeSpacing = theme.spacing === 'compact' ? '28px' : ['large', 'spacious'].includes(theme.spacing) ? '84px' : '56px';
      const themeImageFit = ['cover', 'contain', 'fill'].includes(theme.imageFit) ? theme.imageFit : 'cover';
      const themeStyle = [themeBg && 'background-color:' + themeBg, themeText && 'color:' + themeText, themeAccent && '--section-accent:' + themeAccent].filter(Boolean).join(';');
      const sectionItems = Array.isArray(section.items) ? section.items.filter(item => item && typeof item === 'object') : [];
      const itemLimitKey = ({ 'video-showcase': 'videoCount', 'genre-rail': 'genreCount', 'genre-recommendations': 'genreCount', collection: 'videoCount', spotlight: 'featureCount', creators: 'creatorCount', trustbar: 'itemCount' })[section.type];
      const itemLimit = itemLimitKey ? Number.parseInt(settings[itemLimitKey], 10) : NaN;
      const items = Number.isInteger(itemLimit) && itemLimit > 0 ? sectionItems.slice(0, itemLimit) : sectionItems;
      const cards = items.map(item => {
        const itemImage = safeImageUrl(item.image);
        const itemLink = safeUrl(item.link);
        const cardContent = `${itemImage ? `<img src="${escapeHtml(itemImage)}" alt="" style="object-fit:${themeImageFit}">` : ''}<div><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.description || '')}</p>${item.button ? `<span class="page-card-label">${escapeHtml(item.button)}</span>` : ''}</div>`;
        return itemLink ? `<a class="page-card" href="${escapeHtml(itemLink)}" style="border-radius:${themeRadius};text-decoration:none;color:inherit">${cardContent}</a>` : `<article class="page-card" style="border-radius:${themeRadius}">${cardContent}</article>`;
      }).join('');
      const buttonUrl = safeUrl(content.link);
      const isCustom = String(section.type || '').startsWith('custom-');
      const sectionType = String(section.type || '').replace(/[^a-z-]/g, '');
      const customClass = isCustom ? ' page-section-custom page-section-' + sectionType : ' page-section-' + sectionType;
      const layoutClassMap = { 'video-showcase': { feature: 'page-layout-feature' }, 'genre-rail': { rail: 'page-layout-rail' }, spotlight: { feature: 'page-layout-feature' }, collection: { editorial: 'page-layout-editorial' }, library: { steps: 'page-layout-steps' }, creator: { centered: 'page-layout-centered' }, cta: { banner: 'page-layout-banner', centered: 'page-layout-centered' } };
      const layoutClass = layoutClassMap[section.type]?.[settings.layout] || '';
      const hideIcons = section.type === 'library' && settings.showIcons === 'no';
      const isDivider = section.type === 'custom-divider';
      const isSpacer = section.type === 'custom-spacer';
      const sectionTitle = content.title || section.label || 'セクション';
      let body = '';
      if (section.type === 'hero') {
        const heroBackground = safeImageUrl(content.image || hero.backgroundImage);
        const heroHeadline = content.title || hero.headline || section.label || page.name;
        const heroCopy = content.subtitle || hero.copy || '';
        const heroButtonUrl = safeUrl(content.link || hero.buttonUrl);
        const heroButtonLabel = content.button || hero.buttonLabel || '';
        const heroPosition = ['center', 'top', 'bottom', 'left', 'right'].includes(settings.imagePosition) ? settings.imagePosition : (['center', 'top', 'bottom', 'left', 'right'].includes(hero.imagePosition) ? hero.imagePosition : 'center');
        const heroFit = ['cover', 'contain', 'auto'].includes(theme.imageFit) ? theme.imageFit : (['cover', 'contain', 'auto'].includes(hero.imageFit) ? hero.imageFit : 'cover');
        const heroLayout = ['left', 'right'].includes(settings.imagePosition) ? settings.imagePosition : 'background';
        const heroHeight = ({ compact: '280px', standard: '400px', large: '560px' })[settings.height] || '400px';
        const heroStyle = [
          heroBackground && heroLayout === 'background' && 'background-image:linear-gradient(90deg,rgba(7,9,13,.88),rgba(7,9,13,.28)),url("' + heroBackground + '")',
          'background-position:' + heroPosition,
          'background-size:' + (heroFit === 'auto' ? 'auto' : heroFit),
          'background-repeat:no-repeat',
          'min-height:' + heroHeight
        ].filter(Boolean).join(';');
        const heroCopyMarkup = `${hero.kicker ? `<p class="page-subtitle">${escapeHtml(hero.kicker)}</p>` : ''}<h1 style="font-size:clamp(2rem,5vw,4.5rem);line-height:1.15;max-width:18ch">${escapeHtml(heroHeadline)}</h1>${heroCopy ? `<p class="page-subtitle" style="max-width:60ch">${escapeHtml(heroCopy)}</p>` : ''}${heroButtonLabel && heroButtonUrl ? `<a class="page-button" href="${escapeHtml(heroButtonUrl)}" style="background:${themeAccent || (/^#[0-9a-fA-F]{3,8}$/.test(design.accent || '') ? design.accent : '#d9b45f')};color:${/^#[0-9a-fA-F]{3,8}$/.test(design.buttonText || '') ? design.buttonText : '#101010'}">${escapeHtml(heroButtonLabel)}</a>` : ''}`;
        const heroColors = `border-radius:${themeRadius};background-color:${themeBg || (/^#[0-9a-fA-F]{3,8}$/.test(design.bg || '') ? design.bg : '#07090d')};color:${themeText || (/^#[0-9a-fA-F]{3,8}$/.test(design.text || '') ? design.text : '#f4f4f5')}`;
        if (heroLayout === 'background') {
          body = `<div class="page-custom-hero" style="${escapeHtml(heroStyle)};padding:clamp(48px,9vw,120px) clamp(24px,6vw,80px);${heroColors}">${heroCopyMarkup}</div>`;
        } else {
          const imageFit = ['cover', 'contain'].includes(heroFit) ? heroFit : 'cover';
          const imagePosition = ['top', 'bottom', 'left', 'right'].includes(heroPosition) ? heroPosition : 'center';
          body = `<div class="page-custom-hero-split layout-${heroLayout}" style="--hero-height:${heroHeight};${heroColors}">${heroBackground ? `<img class="page-custom-hero-image" src="${escapeHtml(heroBackground)}" alt="" style="object-fit:${imageFit};object-position:${imagePosition}">` : ''}<div class="page-custom-hero-copy" style="padding:clamp(24px,5vw,64px)">${heroCopyMarkup}</div></div>`;
        }
      } else if (isDivider) body = '<hr class="page-divider">';
      else if (isSpacer) body = '<div class="page-spacer" aria-hidden="true"></div>';
      else if (section.type === 'popular' || section.type === 'new-releases') {
        const products = dynamicSectionData.get(String(section.id || section.type))?.products || [];
        const videoColumns = Math.min(5, Math.max(2, Number.parseInt(settings.columns, 10) || 4));
        const productCards = products.map(product => {
          const productImage = safeImageUrl(product.thumbnail_url);
          const productTitle = escapeHtml(product.title || '動画');
          const productUrl = '/pages/product-detail.html?productId=' + encodeURIComponent(String(product.id || ''));
          const priceAmount = Number(product.price_amount);
          const price = Number.isFinite(priceAmount)
            ? (String(product.price_currency || '').trim() === 'JPY' ? '¥' + priceAmount.toLocaleString('ja-JP') : priceAmount.toLocaleString('ja-JP') + ' ' + escapeHtml(product.price_currency || ''))
            : '';
          return `<a class="page-card page-live-video-card" href="${escapeHtml(productUrl)}" style="border-radius:${themeRadius};text-decoration:none;color:inherit">${productImage ? `<img src="${escapeHtml(productImage)}" alt="" loading="lazy" style="object-fit:${themeImageFit}">` : '<div class="page-live-video-placeholder">VIDEO</div>'}<div><small>${escapeHtml(product.category || 'VIDEO').toUpperCase()}</small><h3>${productTitle}</h3><p>${escapeHtml(product.seller || '')}</p><strong>${escapeHtml(price)}</strong></div></a>`;
        }).join('');
        const emptyMessage = section.type === 'popular' ? '人気の動画はまだありません。' : '公開中の動画はまだありません。';
        const moreLink = buttonUrl && content.button
          ? `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''}">${escapeHtml(content.button)}</a>`
          : '<a class="page-button" href="/pages/video-list.html">すべての動画を見る</a>';
        body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}<div class="page-card-grid page-live-video-grid" style="--page-video-columns:${videoColumns}">${productCards || `<p>${emptyMessage}</p>`}</div>${moreLink}`;
      } else if (section.type === 'categories') {
        const categories = dynamicSectionData.get(String(section.id || section.type))?.categories || [];
        const categoryColumns = Math.min(4, Math.max(2, Number.parseInt(settings.columns, 10) || 3));
        const categoryCards = categories.map(category => {
          const categoryUrl = '/pages/category.html?category=' + encodeURIComponent(String(category.slug || ''));
          const count = Number(category.product_count) || 0;
          return `<a class="page-card page-live-category-card" href="${escapeHtml(categoryUrl)}" style="border-radius:${themeRadius};text-decoration:none;color:inherit"><div><h3>${escapeHtml(category.name || category.slug || 'カテゴリー')}</h3><p>${count.toLocaleString('ja-JP')}件の動画</p><span class="page-card-label">カテゴリーを見る →</span></div></a>`;
        }).join('');
        body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}<div class="page-card-grid page-live-category-grid" style="--page-category-columns:${categoryColumns}">${categoryCards || '<p>カテゴリーはまだ登録されていません。</p>'}</div>`;
      } else if (section.type === 'custom-image-text') {
        const copy = `<div class="page-image-text-copy">${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}${content.button && buttonUrl ? `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''};color:${escapeHtml(theme.buttonText && /^#[0-9a-fA-F]{3,8}$/.test(theme.buttonText) ? theme.buttonText : '#101010')}">${escapeHtml(content.button)}</a>` : ''}</div>`;
        body = `<h2>${escapeHtml(sectionTitle)}</h2><div class="page-image-text-layout">${image ? `<img class="page-section-image" src="${escapeHtml(image)}" alt="" style="object-fit:${themeImageFit}">` : ''}${copy}</div>`;
      } else {
        body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}`;
        if (image && section.type === 'custom-image') body += `<img class="page-section-image" src="${escapeHtml(image)}" alt="" style="object-fit:${themeImageFit}">`;
        if (cards && ['custom-gallery','custom-cards'].includes(section.type)) {
          const columns = Math.min(5, Math.max(2, Number.parseInt(settings.columns, 10) || 3));
          body += `<div class="page-card-grid" style="--page-custom-columns:${columns}">${cards}</div>`;
        }
        if (content.button && buttonUrl && section.type === 'custom-button') body += `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''};color:${escapeHtml(theme.buttonText && /^#[0-9a-fA-F]{3,8}$/.test(theme.buttonText) ? theme.buttonText : '#101010')}">${escapeHtml(content.button)}</a>`;
      }
      if (!isCustom && !['hero', 'popular', 'new-releases', 'categories'].includes(section.type)) {
        const configuredColumns = Number.parseInt(settings.columns, 10);
        const cardColumns = Number.isInteger(configuredColumns) ? Math.min(5, Math.max(2, configuredColumns)) : 0;
        const cardGridStyle = cardColumns ? ` style="--page-custom-columns:${cardColumns}"` : '';
        body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}${image ? `<img class="page-section-image" src="${escapeHtml(image)}" alt="" style="object-fit:${themeImageFit}">` : ''}${cards ? `<div class="page-card-grid"${cardGridStyle}>${cards}</div>` : ''}${content.button && buttonUrl ? `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''};color:${escapeHtml(theme.buttonText && /^#[0-9a-fA-F]{3,8}$/.test(theme.buttonText) ? theme.buttonText : '#101010')}">${escapeHtml(content.button)}</a>` : ''}`;
      }
      return `<section class="page-section${customClass}${layoutClass ? " " + layoutClass : ""}${hideIcons ? " page-hide-icons" : ""}" style="${escapeHtml(themeStyle)};padding-block:${themeSpacing}"><div class="page-section-inner" style="max-width:${themeWidth}">${body}</div></section>`;
    }).join('');

    const pageTitle = String(meta.seoTitle || page.name || 'ページ').trim();
    const description = String(meta.seoDescription || meta.description || '').trim();
    const background = /^#[0-9a-fA-F]{3,8}$/.test(design.bg || '') ? design.bg : '#07090d';
    const textColor = /^#[0-9a-fA-F]{3,8}$/.test(design.text || '') ? design.text : '#f4f4f5';
    const accent = /^#[0-9a-fA-F]{3,8}$/.test(design.accent || '') ? design.accent : '#d9b45f';
    const buttonTextColor = /^#[0-9a-fA-F]{3,8}$/.test(design.buttonText || '') ? design.buttonText : '#101010';
    const heroImage = safeImageUrl(hero.backgroundImage);
    const heroCopy = hero.copy || meta.description || '';
    const heroHeadline = hero.headline || page.name || '';
    const heroButtonUrl = safeUrl(hero.buttonUrl);
    const heroPosition = ['center', 'top', 'bottom', 'left', 'right'].includes(hero.imagePosition) ? hero.imagePosition : 'center';
    const heroFit = ['cover', 'contain', 'auto'].includes(hero.imageFit) ? hero.imageFit : 'cover';
    const headingSize = design.headingSize === 'large' ? 'large' : design.headingSize === 'compact' ? 'compact' : 'standard';
    const contentWidth = ['wide', 'narrow'].includes(design.contentWidth) ? design.contentWidth : 'standard';
    const cardShape = design.cardShape === 'square' ? 'square' : 'rounded';
    const designStyle = ['minimal', 'editorial'].includes(design.style) ? design.style : 'cinematic';
    const chrome = parseJson(entries['vm-demo-page-chrome-' + id] || entries['vm-demo-site-chrome']);
    const branding = parseJson(entries['vm-demo-site-branding']);
    const siteName = String(branding.siteName || 'VIDEO MARKETPLACE').trim() || 'VIDEO MARKETPLACE';
    const footerDescription = chrome.footerDescription || '見つける。買う。楽しむ。';
    const navItems = [
      ['cart', chrome.showCart !== false, 'カート', '/cart'],
      ['purchase', chrome.showPurchase !== false, '動画を購入する', '/pages/browse.html'],
      ['sell', chrome.showSell !== false, '動画を販売する', '/pages/seller-register.html'],
      ['account', chrome.showAccount !== false, 'ログイン', '/pages/login.html']
    ];
    const navOrder = String(chrome.menuOrder || 'cart,purchase,sell').split(',');
    const navHtml = navOrder.concat(navItems.map(item => item[0])).filter((key, index, all) => all.indexOf(key) === index)
      .map(key => navItems.find(item => item[0] === key))
      .filter(item => item && item[1])
      .map(item => `<a href="${escapeHtml(item[3])}">${escapeHtml(item[2])}</a>`).join('');

    res.set('Cache-Control', 'no-store');
    return res.type('html').send(`<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(pageTitle)}</title>${description ? `<meta name="description" content="${escapeHtml(description)}">` : ''}
<link rel="stylesheet" href="/styles.css">
<style>
:root{color-scheme:dark;--page-bg:${background};--page-text:${textColor};--page-accent:${accent}}
body{margin:0;background:var(--page-bg);color:var(--page-text);font-family:system-ui,-apple-system,"Segoe UI",sans-serif}
.page-published-header,.page-published-footer{padding:20px max(5vw,20px);border-bottom:1px solid #ffffff20}.page-published-footer{border-top:1px solid #ffffff20;border-bottom:0;display:grid;gap:12px}.page-published-footer-links{display:flex;gap:16px;flex-wrap:wrap}.page-published-footer-links a{color:var(--page-text);text-decoration:none;font-size:.9rem}
.page-published-header{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap}
.page-published-header a{color:var(--page-text);text-decoration:none;font-weight:700;letter-spacing:.08em}
.page-published-nav{display:flex;gap:16px;flex-wrap:wrap}
.page-published-nav a{font-size:.9rem;font-weight:500;letter-spacing:0}
.page-hero{padding:clamp(64px,10vw,140px) max(5vw,20px);background:${heroImage ? `linear-gradient(#0008,#0008),url("${escapeHtml(heroImage)}") ${heroPosition}/${heroFit}` : 'linear-gradient(135deg,#17191f,#090a0d)'};text-align:center}
.page-hero .eyebrow{color:var(--page-accent);letter-spacing:.14em}
.page-hero h1{font-size:${headingSize === 'large' ? 'clamp(2.4rem,6vw,4.5rem)' : headingSize === 'compact' ? 'clamp(1.6rem,4vw,2.8rem)' : 'clamp(2rem,5vw,4rem)'};white-space:pre-line;margin:14px auto;max-width:900px}
.page-section-inner{max-width:${contentWidth === 'wide' ? '1440px' : contentWidth === 'narrow' ? '780px' : '1160px'};margin:auto}
.page-card{overflow:hidden;border:1px solid #ffffff20;border-radius:${cardShape === 'square' ? '0' : '12px'};background:#ffffff08}
.page-hero p{max-width:760px;margin:0 auto 24px;line-height:1.8}
.page-button{display:inline-block;background:var(--page-accent);color:#101010;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:18px}
.page-hero .page-button{color:${buttonTextColor}}
body.page-style-minimal .page-hero{background:var(--page-bg)!important;border-bottom:1px solid #ffffff20}
body.page-style-editorial .page-hero{background:linear-gradient(135deg,color-mix(in srgb,var(--page-accent) 12%,transparent),transparent 75%)}
.page-section{padding:clamp(34px,6vw,76px) max(5vw,20px);border-bottom:1px solid #ffffff14}.page-custom-hero-split{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:stretch;min-height:var(--hero-height,400px);overflow:hidden}.page-custom-hero-split .page-custom-hero-image{display:block;width:100%;height:100%;min-height:var(--hero-height,400px)}.page-custom-hero-split .page-custom-hero-copy{align-self:center;min-width:0}.page-custom-hero-split.layout-right .page-custom-hero-image{order:2}@media(max-width:700px){.page-custom-hero-split{grid-template-columns:1fr}.page-custom-hero-split .page-custom-hero-image{height:240px;min-height:0;order:0!important}.page-card-grid[style*="--page-custom-columns"]{grid-template-columns:1fr}}
.page-section-inner{margin:auto}
.page-section h2{font-size:clamp(1.4rem,3vw,2.2rem);margin:0 0 12px}
.page-subtitle{line-height:1.8;white-space:pre-line}
.page-section-image{display:block;max-width:100%;max-height:520px;object-fit:cover;border-radius:12px;margin:24px 0}
.page-card-grid{display:grid;grid-template-columns:repeat(var(--page-custom-columns,auto-fit),minmax(220px,1fr));gap:18px;margin-top:24px}.page-layout-feature .page-card:first-child,.page-layout-editorial .page-card:first-child{grid-column:span 2;grid-row:span 2}.page-layout-rail .page-card-grid{grid-auto-columns:minmax(220px,1fr);grid-auto-flow:column;grid-template-columns:none;overflow-x:auto;padding-bottom:8px}.page-layout-steps{counter-reset:page-step}.page-layout-steps .page-card{counter-increment:page-step}.page-layout-steps .page-card h3:before{content:counter(page-step,decimal-leading-zero) " ";color:var(--section-accent,#d9b45f)}.page-layout-centered .page-section-inner{text-align:center}.page-layout-banner{padding:28px;border-radius:16px;background:linear-gradient(120deg,#ffffff12,#ffffff04)}.page-hide-icons .page-card h3:before{content:none}
.page-card{overflow:hidden;border:1px solid #ffffff20;background:#ffffff08}
.page-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.page-card div{padding:18px}.page-card h3{margin:0 0 8px}.page-card p{line-height:1.7;white-space:pre-line}
.page-card-label{color:var(--page-accent);font-weight:700}.page-live-video-card small{display:block;color:var(--page-accent);font-size:.72rem;letter-spacing:.08em}.page-live-video-card strong{display:block;margin-top:8px}.page-live-video-placeholder{display:grid;place-items:center;aspect-ratio:16/9;background:#ffffff0b;color:#ffffff70;font-weight:800;letter-spacing:.2em}.page-live-category-card{min-height:110px;display:flex;align-items:center}.page-live-category-card h3{color:var(--page-accent)}.page-live-video-grid{grid-template-columns:repeat(var(--page-video-columns,4),minmax(0,1fr))}.page-live-category-grid{grid-template-columns:repeat(var(--page-category-columns,3),minmax(0,1fr))}@media(max-width:900px){.page-live-video-grid,.page-live-category-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:600px){.page-live-video-grid,.page-live-category-grid{grid-template-columns:1fr}}.page-section-image{height:auto}.page-image-text-layout{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:center}.page-image-text-copy{min-width:0}.page-image-text-layout .page-section-image{width:100%;height:auto;margin:0}.page-image-text-copy .page-subtitle{margin-top:0}.page-divider{border:0;border-top:1px solid #ffffff30;margin:0}.page-spacer{height:clamp(24px,6vw,96px)}.page-section-text .page-subtitle{max-width:850px}.page-section-button .page-section-inner{text-align:center}.page-section-button .page-section-inner>h2{margin-bottom:18px}.page-section-gallery .page-card-grid,.page-section-cards .page-card-grid{grid-template-columns:repeat(var(--page-custom-columns,3),minmax(0,1fr))}@media(max-width:650px){.page-image-text-layout{grid-template-columns:1fr}}
.page-published-footer{border-top:1px solid #ffffff20;border-bottom:0;line-height:1.7}
@media(max-width:600px){.page-card-grid{grid-template-columns:1fr}.page-layout-feature .page-card:first-child,.page-layout-editorial .page-card:first-child{grid-column:auto;grid-row:auto}.page-section-gallery .page-card-grid,.page-section-cards .page-card-grid{--page-custom-columns:1}}
</style></head><body class="page-style-${designStyle}">
<header class="page-published-header"><a href="/">${escapeHtml(siteName)}</a><nav class="page-published-nav" aria-label="ページメニュー">${navHtml}</nav></header>
<main>${sectionHtml}</main>
<footer class="page-published-footer"><div>${escapeHtml(footerDescription)}</div>${chrome.footerShowLinks !== 'hide' ? `<nav class="page-published-footer-links" aria-label="フッターリンク">${navHtml}</nav>` : ''}<div>${escapeHtml(chrome.footerCopyright || '© VIDEO MARKETPLACE')}</div></footer>
</body></html>`);
  } catch (error) {
    return next(error);
  }
});

  app.use((error, _req, res, _next) => {
    console.error(error);
    const status = Number(error?.statusCode) || 500;
    res.status(status).json({ error: status === 500 ? { code: 'INTERNAL_ERROR', message: 'Internal server error' } : (error.message || 'Request failed') });
  });

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Resource not found' } });
  });

  return app;
}