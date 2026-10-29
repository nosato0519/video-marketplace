import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp } from '../src/app.js';
import { query, closePool } from '../src/db.js';

const pageId = 'acceptance_page_' + Date.now().toString(36);
const marker = 'Published page route acceptance ' + pageId;
const pageUrl = '/__acceptance-published-page-' + pageId;
let server;
let originalSetting;
let settingExisted = false;
let settingBackupLoaded = false;

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

  const entries = {
    'vm-demo-pages': JSON.stringify([{ id: pageId, name: marker, url: pageUrl, status: '公開' }]),
    ['vm-demo-page-sections-' + pageId]: JSON.stringify([{
      id: 'hero',
      type: 'hero',
      label: marker,
      hidden: false,
      order: 0,
      content: { title: marker, subtitle: 'This page is rendered by the real backend route.' }
    }]),
    ['vm-demo-page-meta-' + pageId]: JSON.stringify({ hero: { headline: marker } })
  };
  await query(
    `INSERT INTO platform_settings (setting_key, setting_value, updated_at)
     VALUES ('page_editor_config', $1::jsonb, NOW())
     ON CONFLICT (setting_key)
     DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
    [JSON.stringify({ value: { entries } })]
  );

  server = createServer(createApp());
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${pageUrl}`);
  const html = await response.text();

  assert.equal(response.status, 200, 'published custom URL should return HTTP 200');
  assert.ok(html.includes(marker), 'rendered HTML should contain the published page title');
  assert.ok(html.includes('page-custom-hero'), 'rendered HTML should contain the custom hero section');

  console.log('PASS: published custom URL returns rendered page HTML from the backend.');
} finally {
  if (server) await new Promise(resolve => server.close(resolve));
  try {
    if (settingBackupLoaded) await restoreSetting();
  } finally {
    await closePool();
  }
}
