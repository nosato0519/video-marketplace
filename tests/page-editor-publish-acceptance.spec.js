import { test, expect } from '@playwright/test';

const pageEditorUrl = '/pages/admin-pages.html';
const settingsUrl = '**/api/admin/settings/page-editor';

test('admin page editor persists a newly published page and exposes its homepage link', async ({ page }) => {
  let savedEntries = {};
  let saveCount = 0;

  await page.route(settingsUrl, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: savedEntries }),
      });
      return;
    }

    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      expect(payload.entries).toBeTruthy();
      expect(typeof payload.entries['vm-demo-pages']).toBe('string');
      savedEntries = payload.entries;
      saveCount += 1;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ saved: true }),
      });
      return;
    }

    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  await page.goto(pageEditorUrl);
  await expect(page.getByRole('button', { name: '新しいページを作成' })).toBeVisible();
  await page.getByRole('button', { name: '新しいページを作成' }).click();

  await page.locator('#page-name').fill('受け入れテスト用ページ');
  await page.locator('#page-url').fill('/pages/acceptance-custom-page');
  await page.locator('#page-description').fill('自由に編集したページの受け入れテストです。');
  await page.locator('#page-seo-title').fill('受け入れテスト用ページ SEO');
  await page.locator('#page-bg').fill('#101820');

  await page.locator('#homepage-add-type').selectOption('custom-text');
  await page.locator('#homepage-add-section').click();
  const sectionRow = page.locator('#homepage-section-list .homepage-section-row').first();
  await sectionRow.getByRole('button', { name: '編集' }).click();
  await page.locator('#section-edit-name').fill('独自コンテンツ');
  await page.locator('#section-content-title').fill('自由な見出し');
  await page.locator('#section-content-subtitle').fill('保存されて公開ページに反映される説明文です。');
  await page.getByRole('button', { name: '編集内容を反映' }).click();

  await page.getByRole('button', { name: '公開する' }).click();

  await expect(page.locator('#editor-status')).toContainText('公開しました: /pages/acceptance-custom-page');
  expect(saveCount).toBe(1);

  const publishedPages = JSON.parse(savedEntries['vm-demo-pages']);
  const publishedPage = publishedPages.find((item) => item.name === '受け入れテスト用ページ');

  expect(publishedPage).toBeTruthy();
  expect(publishedPage.status).toBe('公開');
  expect(publishedPage.url).toBe('/pages/acceptance-custom-page');
  expect(typeof savedEntries[`vm-demo-page-sections-${publishedPage.id}`]).toBe('string');
  expect(typeof savedEntries[`vm-demo-page-meta-${publishedPage.id}`]).toBe('string');
  expect(typeof savedEntries[`vm-demo-page-design-${publishedPage.id}`]).toBe('string');
  const savedSections = JSON.parse(savedEntries[`vm-demo-page-sections-${publishedPage.id}`]);
  const customSection = savedSections.find((item) => item.type === 'custom-text');
  expect(customSection).toBeTruthy();
  expect(customSection.label).toBe('独自コンテンツ');
  expect(customSection.content.title).toBe('自由な見出し');
  expect(customSection.content.subtitle).toBe('保存されて公開ページに反映される説明文です。');
  expect(JSON.parse(savedEntries[`vm-demo-page-design-${publishedPage.id}`]).bg).toBe('#101820');
  expect(JSON.parse(savedEntries[`vm-demo-page-meta-${publishedPage.id}`]).seoTitle).toBe('受け入れテスト用ページ SEO');

  await page.reload();
  await expect(page.getByText('受け入れテスト用ページ', { exact: true })).toBeVisible();
  await expect(page.getByText('公開 ・ /pages/acceptance-custom-page', { exact: true })).toBeVisible();
  expect(saveCount).toBe(1);

  await page.route('**/api/site/homepage-settings', async (route) => {
    const pages = JSON.parse(savedEntries['vm-demo-pages'])
      .filter((item) => item.status === '公開')
      .map(({ id, name, url }) => ({ id, name, url, image: '' }));
    const sections = pages.map((publishedPage) => ({
      id: `custom-page-${publishedPage.id}`,
      type: 'custom-page',
      pageId: publishedPage.id,
      label: publishedPage.name,
      hidden: false,
      added: false,
      order: 0,
      content: { title: publishedPage.name, link: publishedPage.url, button: 'ページを見る →' },
    }));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections,
        publishedPages: pages,
        themes: {},
        pageSettings: {},
        siteBranding: { siteName: 'VIDEO MARKETPLACE' },
        siteSettings: {},
        announcements: [],
        homepageTheme: {},
      }),
    });
  });

  await page.goto('/');
  await expect(page.locator('a[href="/pages/acceptance-custom-page"]')).toBeVisible();
  await expect(page.getByText('受け入れテスト用ページ', { exact: true })).toBeVisible();
});

test('admin page editor refuses stale local settings when the server cannot load canonical settings', async ({ page }) => {
  let writeRequests = 0;
  await page.addInitScript(() => {
    localStorage.setItem('vm-demo-pages', JSON.stringify([
      { id: 'stale-page', name: 'サーバー側の古い下書き', url: '/pages/stale-page', status: '下書き' },
    ]));
  });

  await page.route(settingsUrl, async (route) => {
    if (route.request().method() === 'PUT') {
      writeRequests += 1;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'temporarily_unavailable' }) });
  });

  await page.goto(pageEditorUrl);
  const createButton = page.getByRole('button', { name: '新しいページを作成' });
  await expect(createButton).toBeDisabled();
  await expect(page.getByText('サーバー側の古い下書き', { exact: true })).toHaveCount(0);
  expect(writeRequests).toBe(0);
});

test('homepage editor creates and publishes a configurable custom card section', async ({ page }) => {
  let savedSections = [];
  let pageEditorEntries = {};
  const homepageSettings = () => ({
    sections: savedSections,
    publishedPages: [],
    themes: {},
    pageSettings: {},
    siteBranding: { siteName: 'VIDEO MARKETPLACE' },
    siteSettings: {},
    announcements: [],
    homepageTheme: {},
  });

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(homepageSettings()),
    });
  });
  await page.route('**/api/admin/settings/page-editor', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      pageEditorEntries = { ...pageEditorEntries, ...(payload.entries || {}) };
      if (pageEditorEntries['vm-demo-homepage-sections']) {
        savedSections = JSON.parse(pageEditorEntries['vm-demo-homepage-sections']);
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: pageEditorEntries }) });
  });
  await page.route('**/api/admin/settings/homepage', async (route) => {
    if (route.request().method() === 'PUT') {
      const payload = route.request().postDataJSON();
      savedSections = payload.sections;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(homepageSettings()) });
  });

  await page.goto('/pages/admin-setting-general.html');
  await expect(page.locator('#top-settings-list')).toBeVisible();
  await page.locator('#top-add-type').selectOption('custom-cards');
  await page.locator('#top-add-section').click();

  const customRow = page.locator('#top-settings-list .homepage-section-row')
    .filter({ hasText: '自由ブロック：カード一覧' }).last();
  await expect(customRow).toBeVisible();
  await customRow.getByRole('button', { name: '編集' }).click();
  await customRow.getByLabel('見出し').fill('おすすめの学び');
  await customRow.getByRole('textbox', { name: '説明', exact: true }).fill('目的に合った動画を選べます。');
  await customRow.getByLabel('項目（1行ごとに「タイトル|説明|画像URL|リンク先」）')
    .fill('動画講座|基礎から学べます||/pages/video-list.html');
  await page.locator('#top-save-settings').click();

  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  const savedBlock = savedSections.find((section) => section.type === 'custom-cards');
  expect(savedBlock).toBeTruthy();
  expect(savedBlock.content.title).toBe('おすすめの学び');
  expect(savedBlock.content.items).toEqual([
    { title: '動画講座', description: '基礎から学べます', image: '', link: '/pages/video-list.html' },
  ]);

  await page.goto('/');
  const publishedBlock = page.locator('.vm-homepage-custom-cards');
  await expect(publishedBlock).toBeVisible();
  await expect(publishedBlock.getByRole('heading', { name: 'おすすめの学び' })).toBeVisible();
  await expect(publishedBlock.getByText('動画講座', { exact: true })).toBeVisible();
});
