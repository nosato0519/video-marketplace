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
