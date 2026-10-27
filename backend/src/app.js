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
            .map(({ id, name, url }) => ({ id, name, url }));
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
        const raw = editorEntries?.['vm-demo-page-sections-top'] || editorEntries?.['vm-demo-homepage-sections'];
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

    const sectionHtml = visibleSections.map(section => {
      const content = section.content && typeof section.content === 'object' ? section.content : {};
      const image = safeUrl(content.image);
      const theme = parseJson(entries['vm-demo-page-theme-' + id + '-' + String(section.id || section.type || '')]);
      const themeBg = /^#[0-9a-fA-F]{3,8}$/.test(theme.bg || '') ? theme.bg : '';
      const themeText = /^#[0-9a-fA-F]{3,8}$/.test(theme.text || '') ? theme.text : '';
      const themeAccent = /^#[0-9a-fA-F]{3,8}$/.test(theme.accent || '') ? theme.accent : '';
      const themeRadius = theme.radius === 'square' ? '0' : '12px';
      const themeWidth = theme.width === 'wide' ? '1440px' : theme.width === 'narrow' ? '780px' : '1160px';
      const themeSpacing = theme.spacing === 'compact' ? '28px' : theme.spacing === 'spacious' ? '84px' : '56px';
      const themeImageFit = ['cover', 'contain', 'fill'].includes(theme.imageFit) ? theme.imageFit : 'cover';
      const themeStyle = [themeBg && 'background-color:' + themeBg, themeText && 'color:' + themeText, themeAccent && '--section-accent:' + themeAccent].filter(Boolean).join(';');
      const items = Array.isArray(section.items) ? section.items.filter(item => item && typeof item === 'object') : [];
      const cards = items.map(item => {
        const itemImage = safeUrl(item.image);
        const itemLink = safeUrl(item.link);
        const cardContent = `${itemImage ? `<img src="${escapeHtml(itemImage)}" alt="" style="object-fit:${themeImageFit}">` : ''}<div><h3>${escapeHtml(item.title || '')}</h3><p>${escapeHtml(item.description || '')}</p>${item.button ? `<span class="page-card-label">${escapeHtml(item.button)}</span>` : ''}</div>`;
        return itemLink ? `<a class="page-card" href="${escapeHtml(itemLink)}" style="border-radius:${themeRadius};text-decoration:none;color:inherit">${cardContent}</a>` : `<article class="page-card" style="border-radius:${themeRadius}">${cardContent}</article>`;
      }).join('');
      const buttonUrl = safeUrl(content.link);
      const isCustom = String(section.type || '').startsWith('custom-');
      const customClass = isCustom ? ' page-section-custom page-section-' + String(section.type).slice(7).replace(/[^a-z-]/g, '') : '';
      const isDivider = section.type === 'custom-divider';
      const isSpacer = section.type === 'custom-spacer';
      const sectionTitle = content.title || section.label || 'セクション';
      let body = '';
      if (isDivider) body = '<hr class="page-divider">';
      else if (isSpacer) body = '<div class="page-spacer" aria-hidden="true"></div>';
      else {
        body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}`;
        if (image && ['custom-image','custom-image-text'].includes(section.type)) body += `<img class="page-section-image" src="${escapeHtml(image)}" alt="" style="object-fit:${themeImageFit}">`;
        if (cards && ['custom-gallery','custom-cards'].includes(section.type)) body += `<div class="page-card-grid">${cards}</div>`;
        if (content.button && buttonUrl && section.type === 'custom-button') body += `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''};color:${escapeHtml(theme.buttonText && /^#[0-9a-fA-F]{3,8}$/.test(theme.buttonText) ? theme.buttonText : '#101010')}">${escapeHtml(content.button)}</a>`;
        if (section.type === 'custom-image-text' && image && content.button && buttonUrl) body += `<div class="page-image-text-copy"><a class="page-button" href="${escapeHtml(buttonUrl)}">${escapeHtml(content.button)}</a></div>`;
      }
      if (!isCustom) body = `<h2>${escapeHtml(sectionTitle)}</h2>${content.subtitle ? `<p class="page-subtitle">${escapeHtml(content.subtitle)}</p>` : ''}${image ? `<img class="page-section-image" src="${escapeHtml(image)}" alt="" style="object-fit:${themeImageFit}">` : ''}${cards ? `<div class="page-card-grid">${cards}</div>` : ''}${content.button && buttonUrl ? `<a class="page-button" href="${escapeHtml(buttonUrl)}" style="${themeAccent ? 'background:' + themeAccent : ''};color:${escapeHtml(theme.buttonText && /^#[0-9a-fA-F]{3,8}$/.test(theme.buttonText) ? theme.buttonText : '#101010')}">${escapeHtml(content.button)}</a>` : ''}`;
      return `<section class="page-section${customClass}" style="${escapeHtml(themeStyle)};padding-block:${themeSpacing}"><div class="page-section-inner" style="max-width:${themeWidth}">${body}</div></section>`;
    }).join('');

    const pageTitle = String(meta.seoTitle || page.name || 'ページ').trim();
    const description = String(meta.seoDescription || meta.description || '').trim();
    const background = /^#[0-9a-fA-F]{3,8}$/.test(design.bg || '') ? design.bg : '#07090d';
    const textColor = /^#[0-9a-fA-F]{3,8}$/.test(design.text || '') ? design.text : '#f4f4f5';
    const accent = /^#[0-9a-fA-F]{3,8}$/.test(design.accent || '') ? design.accent : '#d9b45f';
    const heroImage = safeUrl(hero.backgroundImage);
    const heroCopy = hero.copy || meta.description || '';
    const heroHeadline = hero.headline || page.name || '';
    const heroButtonUrl = safeUrl(hero.buttonUrl);
    const heroPosition = ['center', 'top', 'bottom', 'left', 'right'].includes(hero.imagePosition) ? hero.imagePosition : 'center';
    const heroFit = ['cover', 'contain', 'auto'].includes(hero.imageFit) ? hero.imageFit : 'cover';
    const headingSize = design.headingSize === 'large' ? 'large' : design.headingSize === 'compact' ? 'compact' : 'standard';
    const contentWidth = ['wide', 'narrow'].includes(design.contentWidth) ? design.contentWidth : 'standard';
    const cardShape = design.cardShape === 'square' ? 'square' : 'rounded';
    const chrome = parseJson(entries['vm-demo-page-chrome-' + id] || entries['vm-demo-site-chrome']);
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
.page-published-header,.page-published-footer{padding:20px max(5vw,20px);border-bottom:1px solid #ffffff20}
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
.page-section{padding:clamp(34px,6vw,76px) max(5vw,20px);border-bottom:1px solid #ffffff14}
.page-section-inner{max-width:1160px;margin:auto}
.page-section h2{font-size:clamp(1.4rem,3vw,2.2rem);margin:0 0 12px}
.page-subtitle{line-height:1.8;white-space:pre-line}
.page-section-image{display:block;max-width:100%;max-height:520px;object-fit:cover;border-radius:12px;margin:24px 0}
.page-card-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:18px;margin-top:24px}
.page-card{overflow:hidden;border:1px solid #ffffff20;border-radius:12px;background:#ffffff08}
.page-card img{width:100%;aspect-ratio:16/9;object-fit:cover;display:block}
.page-card div{padding:18px}.page-card h3{margin:0 0 8px}.page-card p{line-height:1.7;white-space:pre-line}
.page-card-label{color:var(--page-accent);font-weight:700}.page-section-image{height:auto}.page-image-text-copy{max-width:760px}.page-section-image-text .page-section-inner{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:24px;align-items:center}.page-section-image-text .page-section-inner>h2{grid-column:1/-1}.page-section-image-text .page-section-image{width:100%;margin:0}.page-divider{border:0;border-top:1px solid #ffffff30;margin:0}.page-spacer{height:clamp(24px,6vw,96px)}.page-section-text .page-subtitle{max-width:850px}.page-section-button .page-section-inner{text-align:center}.page-section-button .page-section-inner>h2{margin-bottom:18px}.page-section-gallery .page-card-grid{grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}@media(max-width:650px){.page-section-image-text .page-section-inner{grid-template-columns:1fr}}
.page-published-footer{border-top:1px solid #ffffff20;border-bottom:0;line-height:1.7}
@media(max-width:600px){.page-card-grid{grid-template-columns:1fr}}
</style></head><body>
<header class="page-published-header"><a href="/">VIDEO MARKETPLACE</a><nav class="page-published-nav" aria-label="ページメニュー">${navHtml}</nav></header>
<main><section class="page-hero"><span class="eyebrow">${escapeHtml(hero.kicker || 'DISCOVER SOMETHING NEW')}</span><h1>${escapeHtml(heroHeadline)}</h1>${heroCopy ? `<p>${escapeHtml(heroCopy)}</p>` : ''}${hero.buttonLabel && heroButtonUrl ? `<a class="page-button" href="${escapeHtml(heroButtonUrl)}">${escapeHtml(hero.buttonLabel)}</a>` : ''}</section>${sectionHtml}</main>
<footer class="page-published-footer">${escapeHtml(footerDescription)}<div>${escapeHtml(chrome.footerCopyright || '© VIDEO MARKETPLACE')}</div></footer>
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