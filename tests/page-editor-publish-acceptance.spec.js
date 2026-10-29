import { test, expect } from '@playwright/test';

const pageEditorUrl = '/pages/admin-pages.html';
const settingsApiUrl = '/api/admin/settings/page-editor';
const backendBaseUrl = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

test('admin page editor publishes through the real API and exposes the page on the homepage and public URL', async ({ page }) => {
  const originalResponse = await page.request.get(settingsApiUrl);
  expect(originalResponse.ok()).toBe(true);
  const originalSettings = await originalResponse.json();
  const originalEntries = originalSettings.entries && typeof originalSettings.entries === 'object'
    ? originalSettings.entries
    : {};

  const suffix = Date.now().toString(36);
  const pageName = `受け入れテスト用ページ ${suffix}`;
  const pageUrl = `/__acceptance-custom-page-${suffix}`;
  let settingsMayHaveChanged = false;

  try {
    await page.goto(pageEditorUrl);
    await expect(page.getByRole('button', { name: '新しいページを作成' })).toBeVisible();
    await page.getByRole('button', { name: '新しいページを作成' }).click();

    await page.locator('#page-name').fill(pageName);
    await page.locator('#page-url').fill(pageUrl);
    settingsMayHaveChanged = true;
    await page.getByRole('button', { name: '公開する' }).click();

    await expect(page.locator('#editor-status')).toContainText(`公開しました: ${pageUrl}`);

    const savedResponse = await page.request.get(settingsApiUrl);
    expect(savedResponse.ok()).toBe(true);
    const savedSettings = await savedResponse.json();
    const entries = savedSettings.entries;
    expect(entries).toBeTruthy();
    const publishedPages = JSON.parse(entries['vm-demo-pages']);
    const publishedPage = publishedPages.find((item) => item.name === pageName);

    expect(publishedPage).toBeTruthy();
    expect(publishedPage.status).toBe('公開');
    expect(publishedPage.url).toBe(pageUrl);
    expect(typeof entries[`vm-demo-page-sections-${publishedPage.id}`]).toBe('string');
    expect(typeof entries[`vm-demo-page-meta-${publishedPage.id}`]).toBe('string');
    expect(typeof entries[`vm-demo-page-design-${publishedPage.id}`]).toBe('string');

    await page.reload();
    await expect(page.getByText(pageName, { exact: true })).toBeVisible();
    await expect(page.getByText(`公開 ・ ${pageUrl}`, { exact: true })).toBeVisible();

    const homepageResponse = await page.request.get('/api/site/homepage-settings');
    expect(homepageResponse.ok()).toBe(true);
    const homepage = await homepageResponse.json();
    expect(homepage.publishedPages?.some((item) => item.id === publishedPage.id && item.url === pageUrl)).toBe(true);
    expect(homepage.sections?.some((section) =>
      section.type === 'custom-page' &&
      section.pageId === publishedPage.id &&
      section.content?.link === pageUrl
    )).toBe(true);

    await page.goto('/');
    await expect(page.locator(`a[href="${pageUrl}"]`)).toBeVisible();
    await expect(page.getByText(pageName, { exact: true })).toBeVisible();

    const publicPageResponse = await page.request.get(`${backendBaseUrl}${pageUrl}`);
    expect(publicPageResponse.status()).toBe(200);
    const publicPageHtml = await publicPageResponse.text();
    expect(publicPageHtml).toContain(pageName);
    expect(publicPageHtml).toContain('page-custom-hero');
  } finally {
    if (settingsMayHaveChanged) {
      const restoreResponse = await page.request.put(settingsApiUrl, {
        data: { entries: originalEntries },
      });
      expect(restoreResponse.ok()).toBe(true);
    }
  }
});
