import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { createServer } from 'node:http';
import { getPool, query, closePool } from '../src/db.js';
import { createApp } from '../src/app.js';
import { hashSessionToken } from '../src/auth/session.js';

process.env.MEDIA_URL_SECRET ||= 'acceptance-only-media-url-secret-0123456789abcdef';
process.env.MEDIA_STORAGE_DIR ||= '/tmp/video-marketplace-media';
process.env.PAYMENT_WEBHOOK_SECRET ||= 'acceptance-only-payment-webhook-secret-0123456789abcdef';

const pool = getPool();
const server = createServer(createApp());
const suffix = crypto.randomUUID().replaceAll('-', '');
const pageId = 'admin_acceptance_' + suffix;
const pageUrl = '/__acceptance-admin-page-' + suffix;
const adminEmail = `page-editor-admin-${suffix}@acceptance.test`;
const buyerEmail = `page-editor-buyer-${suffix}@acceptance.test`;
const adminToken = crypto.randomBytes(32).toString('base64url');
const buyerToken = crypto.randomBytes(32).toString('base64url');
const adminCookie = `video_marketplace_session=${adminToken}`;
const buyerCookie = `video_marketplace_session=${buyerToken}`;
let adminId;
let buyerId;
let originalSetting;
let settingExisted = false;
let settingBackupLoaded = false;

async function request(baseUrl, path, { method = 'GET', cookie, body } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const response = await fetch(baseUrl + path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let data = text;
  try { data = JSON.parse(text); } catch {}
  return { response, data };
}

async function restoreSetting() {
  if (settingExisted) {
    await query(
      `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
       VALUES ('page_editor_config', $1::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [JSON.stringify(originalSetting)]
    );
  } else {
    await query('DELETE FROM platform_settings WHERE setting_key = $1', ['page_editor_config']);
  }
}

try {
  const previous = await query(
    'SELECT setting_value FROM platform_settings WHERE setting_key = $1 LIMIT 1',
    ['page_editor_config']
  );
  settingExisted = previous.rows.length > 0;
  originalSetting = previous.rows[0]?.setting_value;
  settingBackupLoaded = true;

  const admin = await query(
    `INSERT INTO users (email, email_normalized, password_hash, role, status)
     VALUES ($1, $1, 'acceptance-only', 'admin', 'active') RETURNING id`,
    [adminEmail]
  );
  adminId = admin.rows[0].id;
  const buyer = await query(
    `INSERT INTO users (email, email_normalized, password_hash, role, status)
     VALUES ($1, $1, 'acceptance-only', 'buyer', 'active') RETURNING id`,
    [buyerEmail]
  );
  buyerId = buyer.rows[0].id;

  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  await query(
    'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3), ($4, $5, $3)',
    [adminId, hashSessionToken(adminToken), expiresAt, buyerId, hashSessionToken(buyerToken)]
  );

  server.on('error', (error) => console.error('admin-page-editor-acceptance: server error', error));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const endpoint = '/api/admin/settings/page-editor';

  let result = await request(baseUrl, endpoint);
  assert.equal(result.response.status, 401, 'unauthenticated requests must not read page editor settings');
  result = await request(baseUrl, endpoint, { cookie: buyerCookie });
  assert.equal(result.response.status, 403, 'buyer accounts must not read page editor settings');

  const entries = {
    'vm-demo-pages': JSON.stringify([{ id: pageId, name: '認証付き保存テスト', url: pageUrl, status: '公開' }]),
    ['vm-demo-page-sections-' + pageId]: JSON.stringify([{
      id: 'custom-text',
      type: 'custom-text',
      label: '認証付き保存テスト本文',
      hidden: false,
      order: 0,
      content: { title: '実際の保存API経由の見出し', subtitle: '運営者認証を通して保存した本文です。' },
    }]),
    ['vm-demo-page-meta-' + pageId]: JSON.stringify({ seoTitle: '認証付き保存テスト SEO', description: 'Authenticated page editor acceptance.' }),
    ['vm-demo-page-design-' + pageId]: JSON.stringify({ bg: '#101820', text: '#f4f4f5', accent: '#d9b45f' }),
    ['vm-demo-page-chrome-' + pageId]: JSON.stringify({ showPurchase: true, showSell: false, showAccount: true, showCart: false, menuOrder: 'purchase,sell,cart', footerDescription: 'ページ専用フッター説明', footerShowLinks: 'hide', footerCopyright: '© ページ専用表記' }),
  };

  result = await request(baseUrl, endpoint, {
    method: 'PUT',
    cookie: adminCookie,
    body: { entries },
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.saved, true);

  result = await request(baseUrl, endpoint, { cookie: adminCookie });
  assert.equal(result.response.status, 200, JSON.stringify(result.data));
  assert.equal(result.data.entries['vm-demo-pages'], entries['vm-demo-pages']);
  assert.equal(result.data.entries['vm-demo-page-sections-' + pageId], entries['vm-demo-page-sections-' + pageId]);

  result = await request(baseUrl, pageUrl);
  assert.equal(result.response.status, 200, 'the page saved through the authenticated endpoint should render publicly');
  assert.ok(result.data.includes('実際の保存API経由の見出し'));
  assert.ok(result.data.includes('運営者認証を通して保存した本文です。'));
  assert.ok(result.data.includes('<title>認証付き保存テスト SEO</title>'));
  assert.ok(result.data.includes('--page-bg:#101820'));
  assert.ok(result.data.includes('ページ専用フッター説明'));
  assert.ok(result.data.includes('© ページ専用表記'));
  assert.ok(!result.data.includes('page-published-footer-links'), 'hidden footer links must not render');
  assert.ok(!result.data.includes('href="/pages/seller-register.html"'), 'disabled seller navigation must not render');
  assert.ok(!result.data.includes('href="/cart"'), 'disabled cart navigation must not render');

  result = await request(baseUrl, '/api/site/homepage-settings');
  assert.equal(result.response.status, 200);
  assert.ok(result.data.publishedPages?.some((page) => page.id === pageId && page.url === pageUrl));
  assert.ok(result.data.sections?.some((section) => section.type === 'custom-page' && section.pageId === pageId && section.content?.link === pageUrl));

  console.log('PASS: admin-authenticated page editor save persists to the database and renders on its public URL and homepage.');
} finally {
  await new Promise((resolve) => server.close(resolve));
  if (settingBackupLoaded) await restoreSetting();
  if (adminId || buyerId) {
    await pool.query('DELETE FROM user_sessions WHERE user_id = ANY($1::uuid[])', [[adminId, buyerId].filter(Boolean)]).catch((error) => console.error('admin-page-editor-acceptance: session cleanup failed', error));
    await pool.query('DELETE FROM users WHERE id = ANY($1::uuid[])', [[adminId, buyerId].filter(Boolean)]).catch((error) => console.error('admin-page-editor-acceptance: user cleanup failed', error));
  }
  await closePool();
}
