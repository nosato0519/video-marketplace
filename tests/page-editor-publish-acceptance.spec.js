import { test, expect } from '@playwright/test';

const pageEditorUrl = '/pages/admin-pages.html';
const settingsUrl = '**/api/admin/settings/page-editor';

test('admin page editor blocks publishing when no public section will render', async ({ page }) => {
  let saveCount = 0;

  await page.route(settingsUrl, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: {} }),
      });
      return;
    }

    if (route.request().method() === 'PUT') {
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
  await page.getByRole('button', { name: '新しいページを作成' }).click();
  await page.locator('#page-name').fill('空ページの公開防止');
  await page.locator('#page-url').fill('/pages/empty-page-blocked');
  await page.getByRole('button', { name: '公開する' }).click();

  await expect(page.locator('#editor-status')).toContainText('公開前チェックで未完了');
  expect(saveCount).toBe(0);

  await page.locator('#homepage-add-type').selectOption('custom-text');
  await page.locator('#homepage-add-section').click();
  const sectionRow = page.locator('#homepage-section-list .homepage-section-row').first();
  await sectionRow.getByRole('button', { name: '表示' }).click();
  await expect(sectionRow).toHaveAttribute('data-hidden', 'true');

  await page.getByRole('button', { name: '公開する' }).click();
  await expect(page.locator('#editor-status')).toContainText('公開前チェックで未完了');
  expect(saveCount).toBe(0);
});

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

  const publishedPageRow = page.locator('#managed-pages-list .homepage-section-row').filter({ hasText: '受け入れテスト用ページ' });
  await publishedPageRow.getByRole('button', { name: '編集' }).click();
  const savedSectionRow = page.locator('#homepage-section-list .homepage-section-row').first();
  await savedSectionRow.getByRole('button', { name: '編集' }).click();
  await page.locator('#section-edit-name').fill('キャンセルした変更');
  await page.getByRole('button', { name: '編集内容を反映' }).click();
  await page.locator('#cancel-page-bottom').click();
  await publishedPageRow.getByRole('button', { name: '編集' }).click();
  await expect(page.locator('#homepage-section-list .homepage-section-row').first()).toContainText('独自コンテンツ');
  await expect(page.locator('#homepage-section-list .homepage-section-row').first()).not.toContainText('キャンセルした変更');
  await page.locator('#cancel-page-bottom').click();
  expect(saveCount).toBe(1);

  await publishedPageRow.getByRole('button', { name: '編集' }).click();
  await page.locator('#homepage-section-list .homepage-section-row').first().getByRole('button', { name: '編集' }).click();
  await page.locator('#section-edit-name').fill('保存済みの変更');
  await page.getByRole('button', { name: '編集内容を反映' }).click();
  await page.getByRole('button', { name: '公開する' }).click();
  await expect(page.locator('#editor-status')).toContainText('公開しました: /pages/acceptance-custom-page');
  expect(saveCount).toBe(2);

  await page.locator('#homepage-section-list .homepage-section-row').first().getByRole('button', { name: '編集' }).click();
  await page.locator('#section-edit-name').fill('保存後の未保存変更');
  await page.getByRole('button', { name: '編集内容を反映' }).click();
  await page.locator('#cancel-page-bottom').click();
  await publishedPageRow.getByRole('button', { name: '編集' }).click();
  await expect(page.locator('#homepage-section-list .homepage-section-row').first()).toContainText('保存済みの変更');
  await expect(page.locator('#homepage-section-list .homepage-section-row').first()).not.toContainText('保存後の未保存変更');
  await page.locator('#cancel-page-bottom').click();
  expect(saveCount).toBe(2);

  await page.getByRole('button', { name: '新しいページを作成' }).click();
  await page.locator('#page-name').fill('キャンセル確認用ページ');
  await page.locator('#cancel-page-bottom').click();
  await expect(page.locator('#page-editor')).toBeHidden();
  await expect(page.locator('#page-management')).toBeVisible();
  await expect(page.getByText('キャンセル確認用ページ', { exact: true })).toHaveCount(0);
  expect(saveCount).toBe(2);

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
      content: { title: publishedPage.name, subtitle: 'TOPページの表示説明も設定できます。', link: publishedPage.url, button: '詳しく見る →', layout: 'wide' },
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
  const homepagePageLink = page.locator('section[data-vm-section-type="custom-page"] a[href="/pages/acceptance-custom-page"]');
  await expect(homepagePageLink).toBeVisible();
  await expect(homepagePageLink).toContainText('受け入れテスト用ページ');
  await expect(homepagePageLink).toContainText('TOPページの表示説明も設定できます。');
  await expect(homepagePageLink).toContainText('詳しく見る →');
  await expect(homepagePageLink).toHaveAttribute('style', /flex-direction:\s*column/);
});

test('admin page editor persists section order and visibility across reloads', async ({ page }) => {
  let savedEntries = {};

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
      savedEntries = route.request().postDataJSON().entries;
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
  await page.getByRole('button', { name: '新しいページを作成' }).click();
  await page.locator('#page-name').fill('セクション順序保存テスト');
  await page.locator('#page-url').fill('/pages/section-order-persistence');

  for (const [label, title] of [
    ['先に追加したセクション', '先に追加した見出し'],
    ['後に追加したセクション', '後に追加した見出し'],
  ]) {
    await page.locator('#homepage-add-type').selectOption('custom-text');
    await page.locator('#homepage-add-section').click();
    const row = page.locator('#homepage-section-list .homepage-section-row').last();
    await row.getByRole('button', { name: '編集' }).click();
    await page.locator('#section-edit-name').fill(label);
    await page.locator('#section-content-title').fill(title);
    await page.getByRole('button', { name: '編集内容を反映' }).click();
  }

  const rows = page.locator('#homepage-section-list .homepage-section-row');
  await rows.nth(1).getByRole('button', { name: '↑' }).click();
  await page.locator('#homepage-section-list .homepage-section-row').first().getByRole('button', { name: '表示' }).click();
  await page.getByRole('button', { name: '公開する' }).click();
  await expect(page.locator('#editor-status')).toContainText('公開しました: /pages/section-order-persistence');

  const pages = JSON.parse(savedEntries['vm-demo-pages']);
  const savedPage = pages.find((item) => item.url === '/pages/section-order-persistence');
  expect(savedPage).toBeTruthy();
  const sectionsKey = `vm-demo-page-sections-${savedPage.id}`;
  const sections = JSON.parse(savedEntries[sectionsKey]);
  expect(sections.map((item) => item.label)).toEqual(['後に追加したセクション', '先に追加したセクション']);
  expect(sections.map((item) => item.hidden)).toEqual([true, false]);
  expect(sections.map((item) => item.order)).toEqual([0, 1]);

  await page.reload();
  const pageRow = page.locator('#managed-pages-list .homepage-section-row').filter({ hasText: 'セクション順序保存テスト' });
  await pageRow.getByRole('button', { name: '編集' }).click();
  const reloadedRows = page.locator('#homepage-section-list .homepage-section-row');
  await expect(reloadedRows).toHaveCount(2);
  await expect(reloadedRows.nth(0)).toContainText('後に追加したセクション');
  await expect(reloadedRows.nth(0)).toHaveAttribute('data-hidden', 'true');
  await expect(reloadedRows.nth(1)).toContainText('先に追加したセクション');
  await expect(reloadedRows.nth(1)).toHaveAttribute('data-hidden', 'false');
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

test('admin page editor preserves local settings when no server configuration exists yet', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('vm-demo-pages', JSON.stringify([
      { id: 'local-first-run-page', name: '初回移行前の保存ページ', url: '/pages/local-first-run-page', status: '下書き' },
    ]));
  });

  await page.route(settingsUrl, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ entries: null }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
  });

  await page.goto(pageEditorUrl);
  await expect(page.getByRole('button', { name: '新しいページを作成' })).toBeVisible();
  await expect(page.getByText('初回移行前の保存ページ', { exact: true })).toBeVisible();
});

test('homepage editor publishes all configurable custom blocks and adapts card columns to viewport width', async ({ page }) => {
  let savedSections = [];
  let pageEditorEntries = {};
  let savedThemes = {};
  const homepageSettings = () => ({
    sections: savedSections,
    publishedPages: [],
    themes: savedThemes,
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

  const blockCases = [
    { type: 'custom-text', title: '独自文章', subtitle: '文章ブロックの説明', body: '公開される自由な本文です。' },
    { type: 'custom-image', title: '独自画像', image: 'https://example.com/homepage-test.jpg' },
    { type: 'custom-image-text', title: '画像と文章', subtitle: '画像と文章の説明', body: '画像と一緒に表示する本文です。', image: 'https://example.com/homepage-text-test.jpg' },
    { type: 'custom-gallery', title: '独自ギャラリー', items: '写真A|写真の説明|https://example.com/gallery.jpg|/pages/video-list.html', columns: '4' },
    { type: 'custom-cards', title: 'おすすめの学び', subtitle: '目的に合った動画を選べます。', items: '動画講座|基礎から学べます||/pages/video-list.html', columns: '4' },
    { type: 'custom-button', title: '独自ボタン', subtitle: 'ボタンの説明', button: '動画一覧へ', link: '/pages/video-list.html' },
    { type: 'custom-divider' },
    { type: 'custom-spacer' },
  ];

  await page.goto('/pages/admin-setting-general.html');
  await expect(page.locator('#top-settings-list')).toBeVisible();

  for (const block of blockCases) {
    await page.locator('#top-add-type').selectOption(block.type);
    await page.locator('#top-add-section').click();
    const customRow = page.locator('#top-settings-list .homepage-section-row')
      .filter({ hasText: `自由ブロック：${({
        'custom-text': '文章',
        'custom-image': '画像',
        'custom-image-text': '画像＋文章',
        'custom-gallery': '画像ギャラリー',
        'custom-cards': 'カード一覧',
        'custom-button': 'ボタン',
        'custom-divider': '区切り線',
        'custom-spacer': '余白',
      })[block.type]}` }).last();
    await expect(customRow).toBeVisible();
    await customRow.getByRole('button', { name: '編集' }).click();

    if (block.title) await customRow.getByLabel('見出し').fill(block.title);
    if (block.subtitle) await customRow.getByRole('textbox', { name: '説明', exact: true }).fill(block.subtitle);
    if (block.body) await customRow.getByLabel('本文').fill(block.body);
    if (block.image) await customRow.getByLabel('画像URL').fill(block.image);
    if (block.button) await customRow.getByLabel('ボタン表示').fill(block.button);
    if (block.link) await customRow.getByLabel('リンク先').fill(block.link);
    if (block.items) {
      await customRow.getByLabel('項目（1行ごとに「タイトル|説明|画像URL|リンク先」）').fill(block.items);
      await customRow.getByLabel('1行の表示数').selectOption(block.columns);
    }
    if (block.type === 'custom-image') {
      await customRow.getByText('セクションのデザイン設定', { exact: true }).click();
      await customRow.getByLabel('画像の表示方法').selectOption('contain');
      await customRow.getByLabel('角丸').selectOption('square');
    }
    if (block.type === 'custom-button') {
      await customRow.getByText('セクションのデザイン設定', { exact: true }).click();
      await customRow.getByLabel('ボタン文字色（HEX）').fill('#ffffff');
      await customRow.getByLabel('角丸').selectOption('square');
    }
  }

  await page.locator('#top-add-type').selectOption('custom-text');
  await page.locator('#top-add-section').click();
  const repeatedTextRow = page.locator('#top-settings-list .homepage-section-row')
    .filter({ hasText: '自由ブロック：文章' }).last();
  await repeatedTextRow.getByRole('button', { name: '編集' }).click();
  await repeatedTextRow.getByLabel('見出し').fill('2つ目の独自文章');
  await repeatedTextRow.getByLabel('本文').fill('同じ種類でも別々に表示されます。');

  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');

  const repeatedTextBlocks = savedSections.filter((section) => section.type === 'custom-text');
  expect(repeatedTextBlocks).toHaveLength(2);
  expect(new Set(repeatedTextBlocks.map((section) => section.id)).size).toBe(2);
  expect(repeatedTextBlocks.some((section) => section.content.title === '2つ目の独自文章')).toBe(true);

  for (const block of blockCases) {
    const savedBlock = savedSections.find((section) => section.type === block.type);
    expect(savedBlock, `missing saved block: ${block.type}`).toBeTruthy();
    if (block.title) expect(savedBlock.content.title).toBe(block.title);
    if (block.body) expect(savedBlock.content.body).toBe(block.body);
    if (block.image) expect(savedBlock.content.image).toBe(block.image);
    if (block.button) expect(savedBlock.content.button).toBe(block.button);
    if (block.link) expect(savedBlock.content.link).toBe(block.link);
    if (block.items) {
      expect(savedBlock.content.items).toEqual([{
        title: block.items.split('|')[0],
        description: block.items.split('|')[1],
        image: block.items.split('|')[2],
        link: block.items.split('|')[3],
      }]);
      expect(savedBlock.content.columns).toBe(4);
    }
  }
  expect(savedSections.find((section) => section.type === 'custom-image').content.theme).toMatchObject({ imageFit: 'contain', radius: 'square' });
  expect(savedSections.find((section) => section.type === 'custom-button').content.theme).toMatchObject({ buttonText: '#ffffff', radius: 'square' });

  const imageBlock = savedSections.find((section) => section.type === 'custom-image');
  const buttonBlock = savedSections.find((section) => section.type === 'custom-button');
  savedThemes[imageBlock.id] = { imageFit: 'contain', radius: 'square' };
  savedThemes[buttonBlock.id] = { buttonText: '#ffffff', radius: 'square' };

  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  for (const block of blockCases) {
    if (block.title) {
      await expect(page.getByRole('heading', { name: block.title, exact: true })).toBeVisible();
    } else {
      await expect(page.locator(`.vm-homepage-${block.type}`).first()).toBeVisible();
    }
  }
  await expect(page.locator('.vm-homepage-custom-text')).toHaveCount(2);
  await expect(page.locator('.vm-homepage-custom-text').nth(0)).toContainText('公開される自由な本文です。');
  await expect(page.locator('.vm-homepage-custom-text').nth(1)).toContainText('同じ種類でも別々に表示されます。');
  await expect(page.locator('.vm-homepage-custom-image-text')).toContainText('画像と一緒に表示する本文です。');
  await expect(page.locator('.vm-homepage-custom-image img')).toHaveCSS('object-fit', 'contain');
  await expect(page.locator('.vm-homepage-custom-image img')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('.vm-homepage-custom-button a')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.vm-homepage-custom-button a')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('.vm-homepage-custom-gallery')).toContainText('写真A');
  await expect(page.locator('.vm-homepage-custom-cards')).toContainText('動画講座');

  const grid = page.locator('.vm-homepage-custom-cards .vm-homepage-custom-grid');
  const columnCount = async () => page.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length, await grid.elementHandle());
  await expect.poll(columnCount).toBe(4);
  await page.setViewportSize({ width: 800, height: 900 });
  await expect.poll(columnCount).toBe(3);
  await page.setViewportSize({ width: 600, height: 900 });
  await expect.poll(columnCount).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(columnCount).toBe(1);
});

test('homepage custom-page layout selection persists and controls public rendering', async ({ page }) => {
  const publishedPage = { id: 'layout-persistence-page', name: 'レイアウト保存テスト', url: '/pages/layout-persistence-page', image: '', sections: [{ id: 'page-popular', type: 'popular', label: 'ページ内の人気動画', content: { title: 'TOP反映専用の人気動画見出し', subtitle: 'TOP表示用の説明文', settings: { videoCount: 4, columns: 2 } }, settings: { videoCount: 4, columns: 2 }, theme: { bg: '#123456', text: '#ffffff', accent: '#abcdef', width: 'narrow', spacing: 'large', radius: 'square', imageFit: 'contain', buttonText: '#222222' }, items: [] }, { id: 'page-video-showcase', type: 'video-showcase', label: 'ページ内の作品紹介', content: { settings: { layout: 'grid', videoCount: 3 } }, items: [] }, { id: 'page-intro', type: 'custom-text', label: 'ページ本文', content: { title: '埋め込みセクション', subtitle: 'TOPに反映される本文', body: '独立ページで保存した内容です。' }, theme: { bg: '#234567', text: '#eeeeee', width: 'wide', spacing: 'compact' }, items: [] },
    { id: 'page-custom-gallery', type: 'custom-gallery', label: 'ページ内ギャラリー', settings: { columns: '4' }, content: { title: 'ページ内ギャラリー' }, items: [{ title: '画像A' }, { title: '画像B' }, { title: '画像C' }, { title: '画像D' }] }, { id: 'page-genre-rail', type: 'genre-rail', label: 'ページ内ジャンル', content: { settings: { layout: 'grid', genreCount: 3 } }, items: [] }, { id: 'page-finder', type: 'finder', label: 'ページ内検索', content: { settings: { searchFields: 'basic' } }, items: [] }] };
  let savedSections = [{
    id: 'custom-page-layout-persistence-page',
    type: 'custom-page',
    pageId: publishedPage.id,
    label: publishedPage.name,
    hidden: false,
    added: false,
    order: 0,
    content: { title: publishedPage.name, subtitle: '表示設定の保存テスト', link: publishedPage.url, button: '詳しく見る →', layout: 'standard' },
  }];

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections: savedSections,
        publishedPages: [publishedPage],
        themes: {},
        pageSettings: {},
        siteBranding: { siteName: 'VIDEO MARKETPLACE' },
        siteSettings: {},
        announcements: [],
        homepageTheme: {},
      }),
    });
  });
  await page.route('**/api/admin/settings/page-editor', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: {} }) });
  });
  await page.route('**/api/admin/settings/homepage', async (route) => {
    if (route.request().method() === 'PUT') {
      savedSections = route.request().postDataJSON().sections;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ sections: savedSections }) });
  });

  await page.goto('/pages/admin-setting-general.html');
  const row = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: publishedPage.name });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: '編集' }).click();
  await row.locator('label').filter({ hasText: '表示レイアウト' }).locator('select').selectOption('center');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.find((item) => item.type === 'custom-page').content.layout).toBe('center');

  await page.goto('/');
  const publicLink = page.locator('section[data-vm-section-type="custom-page"] a[href="/pages/layout-persistence-page"]');
  await expect(publicLink).toBeVisible();
  await expect(publicLink).toContainText('レイアウト保存テスト');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-popular"]')).toBeVisible();
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-popular"] h2')).toContainText('TOP反映専用の人気動画見出し');
  const embeddedPopular = page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-popular"]');
  await expect(embeddedPopular).toContainText('TOP表示用の説明文');
  await expect(embeddedPopular).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(embeddedPopular).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(embeddedPopular).toHaveCSS('max-width', '900px');
  await expect(embeddedPopular).toHaveCSS('padding-top', '48px');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-genre-rail"] .genre-track')).toHaveCSS('display', 'grid');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-genre-rail"] .genre-track')).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-finder"] .find-row span')).toHaveCount(2);
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-finder"] .find-row span').nth(0)).toBeHidden();
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-finder"] .find-row span').nth(1)).toBeHidden();
  const embeddedShowcaseGrid = page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-video-showcase"] .video-showcase-grid');
  await expect(embeddedShowcaseGrid).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  await expect(page.locator('[data-vm-section-type="custom-page"] .vm-published-page-block-custom-text')).toContainText('埋め込みセクション');
  await expect(page.locator('[data-vm-section-type="custom-page"] .vm-published-page-block-custom-text')).toContainText('独立ページで保存した内容です。');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-custom-gallery"] > div')).toHaveCSS('grid-template-columns', /\S+\s+\S+\s+\S+\s+\S+/);
  const embeddedText = page.locator('[data-vm-section-type="custom-page"] .vm-published-page-block-custom-text');
  await expect(embeddedText).toHaveCSS('background-color', 'rgb(35, 69, 103)');
  await expect(embeddedText).toHaveCSS('color', 'rgb(238, 238, 238)');
  await expect(embeddedText).toHaveCSS('max-width', 'none');
  await expect(embeddedText).toHaveCSS('padding-top', '12px');
  await expect(publicLink).toHaveAttribute('style', /justify-content:\s*space-between/);
  await page.reload();
  await expect(publicLink).toHaveAttribute('style', /justify-content:\s*space-between/);

  await page.goto('/pages/admin-setting-general.html');
  const refreshedRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: publishedPage.name });
  await refreshedRow.getByRole('button', { name: '編集' }).click();
  await refreshedRow.locator('label').filter({ hasText: '表示レイアウト' }).locator('select').selectOption('poster');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.find((item) => item.type === 'custom-page').content.layout).toBe('poster');

  await page.goto('/');
  const posterLink = page.locator('section[data-vm-section-type="custom-page"] a[href="/pages/layout-persistence-page"]');
  await expect(posterLink).toHaveAttribute('style', /min-height:\s*260px/);
  await expect(posterLink).toContainText('レイアウト保存テスト');
  await page.reload();
  await expect(posterLink).toHaveAttribute('style', /min-height:\s*260px/);
});

test('homepage dynamic sections persist layout controls and apply them to public sections', async ({ page }) => {
  let savedSections = [{
    id: 'popular',
    type: 'popular',
    label: '人気の動画',
    hidden: false,
    added: false,
    order: 0,
    content: { layout: 'standard' },
  }, {
    id: 'genre-rail',
    type: 'genre-rail',
    label: '気分から選ぶ',
    hidden: false,
    added: false,
    order: 1,
    content: { layout: 'standard' },
  }, {
    id: 'spotlight',
    type: 'spotlight',
    label: '今、観てほしい作品たち',
    hidden: false,
    added: false,
    order: 2,
    content: { layout: 'standard' },
  }, {
    id: 'custom-banner',
    type: 'custom-text',
    label: '自由ブロックテスト',
    hidden: false,
    added: true,
    order: 3,
    content: {
      title: '自由ブロックのテーマ確認',
      body: '保存したデザインが公開TOPに反映されます。',
      theme: { bg: '#234567', text: '#eeeeee', accent: '#abcdef', width: 'narrow', spacing: 'compact', radius: 'square' },
    },
  }, {
    id: 'custom-gallery-columns',
    type: 'custom-gallery',
    label: '自由ギャラリー列数',
    hidden: false,
    added: true,
    order: 4,
    settings: { columns: '4' },
    content: {
      title: 'ギャラリー列数テスト',
      items: [
        { title: '作品A' },
        { title: '作品B' },
        { title: '作品C' },
        { title: '作品D' },
      ],
    },
  }, {
    id: 'library',
    type: 'library',
    label: '購入後のライブラリ案内',
    hidden: false,
    added: false,
    order: 4,
    content: { settings: { layout: 'cards', showIcons: 'no' } },
  }, {
    id: 'creator',
    type: 'creator',
    label: '販売者向け案内',
    hidden: false,
    added: false,
    order: 5,
    content: { settings: { layout: 'centered' } },
  }, {
    id: 'cta',
    type: 'cta',
    label: '最後の案内',
    hidden: false,
    added: false,
    order: 6,
    content: { settings: { layout: 'centered' } },
  }, {
    id: 'collection',
    type: 'collection',
    label: '編集的な作品紹介',
    hidden: false,
    added: false,
    order: 7,
    content: { settings: { layout: 'editorial' } },
  }, {
    id: 'trustbar',
    type: 'trustbar',
    label: '購入ガイド項目数',
    hidden: false,
    added: false,
    order: 8,
    settings: { itemCount: '2' },
    content: {},
  }, {
    id: 'hero',
    type: 'hero',
    label: 'メインビジュアル高さ',
    hidden: false,
    added: false,
    order: 9,
    settings: { height: 'compact', imagePosition: 'left' },
    content: {},
  }];
  const settings = () => ({
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
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings()) });
  });
  await page.route('**/api/admin/settings/page-editor', async (route) => {
    if (route.request().method() === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ entries: {} }) });
  });
  await page.route('**/api/admin/settings/homepage', async (route) => {
    if (route.request().method() === 'PUT') {
      savedSections = route.request().postDataJSON().sections;
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ saved: true }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(settings()) });
  });

  await page.goto('/pages/admin-setting-general.html');
  const popularRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '人気の動画' }).first();
  await popularRow.getByRole('button', { name: '編集' }).click();
  await popularRow.locator('label').filter({ hasText: '表示レイアウト' }).locator('select').selectOption('center');
  await popularRow.getByText('表示内容の設定', { exact: true }).click();
  await popularRow.locator('label').filter({ hasText: '表示する動画数' }).locator('select').selectOption('4');
  await popularRow.locator('label').filter({ hasText: '1行のカード数' }).locator('select').selectOption('4');
  await popularRow.getByText('セクションのデザイン設定', { exact: true }).click();
  await popularRow.locator('label').filter({ hasText: '背景色（HEX）' }).locator('input').fill('#123456');
  await popularRow.locator('label').filter({ hasText: 'コンテンツ幅' }).locator('select').selectOption('wide');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  const savedPopular = savedSections.find((section) => section.id === 'popular');
  expect(savedPopular.content.layout).toBe('center');
  expect(savedPopular.content.settings.videoCount).toBe(4);
  expect(savedPopular.content.settings.columns).toBe(4);
  expect(savedPopular.content.theme.bg).toBe('#123456');
  expect(savedPopular.content.theme.width).toBe('wide');

  const genreRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '気分から選ぶ' }).first();
  await genreRow.getByRole('button', { name: '編集' }).click();
  await genreRow.getByText('表示内容の設定', { exact: true }).click();
  await genreRow.locator('label').filter({ hasText: '表示形式' }).locator('select').selectOption('grid');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  const savedGenreRail = savedSections.find((section) => section.id === 'genre-rail');
  expect(savedGenreRail.content.settings.layout).toBe('grid');

  const spotlightRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '今、観てほしい作品たち' }).first();
  await spotlightRow.getByRole('button', { name: '編集' }).click();
  await spotlightRow.getByText('表示内容の設定', { exact: true }).click();
  await spotlightRow.locator('details select:has(option[value="feature"]):has(option[value="grid"])').selectOption('grid');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.find((section) => section.id === 'spotlight').content.settings.layout).toBe('grid');

  const libraryRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '購入後のライブラリ案内' }).first();
  await libraryRow.getByRole('button', { name: '編集' }).click();
  await libraryRow.getByText('表示内容の設定', { exact: true }).click();
  await libraryRow.locator('details select:has(option[value="flow"]):has(option[value="cards"])').selectOption('cards');
  await libraryRow.locator('details select:has(option[value="yes"]):has(option[value="no"])').selectOption('no');
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.find((section) => section.id === 'library').content.settings.layout).toBe('cards');
  expect(savedSections.find((section) => section.id === 'library').content.settings.showIcons).toBe('no');

  const reorderGenreRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '気分から選ぶ' }).first();
  await reorderGenreRow.getByRole('button', { name: '↑' }).click();
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.slice(0, 4).map((section) => section.id)).toEqual(['genre-rail', 'popular', 'spotlight', 'custom-banner']);
  expect(savedSections.slice(0, 4).map((section) => section.order)).toEqual([0, 1, 2, 3]);

  await page.goto('/');
  const publicSection = page.locator('#popular');
  await expect(publicSection).toBeVisible();
  await expect(publicSection).toHaveCSS('text-align', 'center');
  await expect(publicSection).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(publicSection).toHaveCSS('max-width', 'none');
  await expect(page.locator('#videos .video-card:visible')).toHaveCount(4);
  await expect(page.locator('#videos')).toHaveCSS('grid-template-columns', /repeat\(4,/);
  await expect(page.locator('.genre-rail .genre-track')).toHaveCSS('display', 'grid');
  await expect(page.locator('.spotlight .spotlight-stack')).toHaveCSS('display', 'grid');
  await expect(page.locator('.spotlight .spotlight-stack')).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  await expect(page.locator('#library .library-flow')).toHaveCSS('display', 'grid');
  await expect(page.locator('#library .library-flow .flow-line').first()).toBeHidden();
  await expect(page.locator('#library .library-flow .flow-card > span').first()).toBeHidden();
  await expect(page.locator('#creator')).toHaveCSS('grid-template-columns', /^minmax\(0px,\s*1fr\)$/);
  await expect(page.locator('#creator .creator-copy')).toHaveCSS('text-align', 'center');
  await expect(page.locator('.cta')).toHaveCSS('text-align', 'center');
  const editorialCollection = page.locator('#collection');
  await expect(editorialCollection.locator('.video-grid')).toHaveCSS('grid-template-columns', /^minmax\(0px,\s*1fr\)$/);
  await expect(editorialCollection.locator('.video-card').first()).toHaveCSS('display', 'grid');
  await expect(editorialCollection.locator('.video-card').first()).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  await expect(page.locator('.trustbar > div:visible')).toHaveCount(2);
  await expect(page.locator('.vm-homepage-custom-gallery .vm-homepage-custom-grid')).toHaveAttribute('data-columns', '4');
  await expect(page.locator('.hero')).toHaveCSS('min-height', '420px');
  await expect(page.locator('.hero .hero-bg')).toHaveCSS('background-position', '0% 50%');
  const customBlock = page.locator('.vm-homepage-custom-text[data-vm-section-id="custom-banner"]');
  await expect(customBlock).toBeVisible();
  await expect(customBlock).toHaveCSS('background-color', 'rgb(35, 69, 103)');
  await expect(customBlock).toHaveCSS('color', 'rgb(238, 238, 238)');
  await expect(customBlock).toHaveCSS('max-width', '900px');
  await expect(customBlock).toHaveCSS('padding-top', '12px');
  await expect(customBlock).toHaveCSS('border-radius', '0px');
  await page.reload();
  await expect(page.locator('#popular')).toHaveCSS('text-align', 'center');
  await expect(page.locator('#popular')).toHaveCSS('background-color', 'rgb(18, 52, 86)');

  await page.goto('/pages/admin-setting-general.html');
  const customBlockRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '自由ブロックテスト' }).first();
  await customBlockRow.getByRole('button', { name: '非表示にする' }).click();
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.find((section) => section.id === 'custom-banner').hidden).toBe(true);

  await page.goto('/');
  const hiddenCustomBlock = page.locator('.vm-homepage-custom-text[data-vm-section-id="custom-banner"]');
  await expect(hiddenCustomBlock).toBeHidden();
  await expect(hiddenCustomBlock).toHaveAttribute('aria-hidden', 'true');
});

test('admin page editor persists page-specific header and footer settings', async ({ page }) => {
  let savedEntries = {};

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
      savedEntries = route.request().postDataJSON().entries;
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
  await page.getByRole('button', { name: '新しいページを作成' }).click();
  await page.locator('#page-name').fill('ヘッダー・フッター設定保存テスト');
  await page.locator('#page-url').fill('/pages/chrome-settings-persistence');
  await page.locator('#header-show-sell').uncheck();
  await page.locator('#header-show-cart').uncheck();
  await page.locator('#header-show-purchase').check();
  await page.locator('#header-show-account').check();
  await page.locator('#header-menu-order').selectOption('purchase,sell,cart');
  await page.locator('#footer-description').fill('ページ専用のフッター説明');
  await page.locator('#footer-show-links').selectOption('hide');
  await page.locator('#footer-copyright').fill('© ページ設定保存テスト');

  await page.locator('#homepage-add-type').selectOption('custom-text');
  await page.locator('#homepage-add-section').click();
  await page.getByRole('button', { name: '公開する' }).click();

  await expect(page.locator('#editor-status')).toContainText('公開しました: /pages/chrome-settings-persistence');

  const pages = JSON.parse(savedEntries['vm-demo-pages']);
  const savedPage = pages.find((item) => item.url === '/pages/chrome-settings-persistence');
  expect(savedPage).toBeTruthy();
  const chrome = JSON.parse(savedEntries[`vm-demo-page-chrome-${savedPage.id}`]);
  expect(chrome).toMatchObject({
    showPurchase: true,
    showSell: false,
    showAccount: true,
    showCart: false,
    menuOrder: 'purchase,sell,cart',
    footerDescription: 'ページ専用のフッター説明',
    footerShowLinks: 'hide',
    footerCopyright: '© ページ設定保存テスト',
  });

  await page.reload();
  const pageRow = page.locator('#managed-pages-list .homepage-section-row').filter({ hasText: 'ヘッダー・フッター設定保存テスト' });
  await pageRow.getByRole('button', { name: '編集' }).click();
  await expect(page.locator('#header-show-sell')).not.toBeChecked();
  await expect(page.locator('#header-show-cart')).not.toBeChecked();
  await expect(page.locator('#header-show-purchase')).toBeChecked();
  await expect(page.locator('#header-show-account')).toBeChecked();
  await expect(page.locator('#footer-description')).toHaveValue('ページ専用のフッター説明');
  await expect(page.locator('#footer-show-links')).toHaveValue('hide');
  await expect(page.locator('#footer-copyright')).toHaveValue('© ページ設定保存テスト');
});

test('admin page editor restores a page and its settings when deletion cannot be saved to the server', async ({ page }) => {
  const pageId = 'delete-rollback-page';
  const pageName = '削除失敗時の復元テスト';
  let savedEntries = {
    'vm-demo-pages': JSON.stringify([
      { id: pageId, name: pageName, url: '/pages/delete-rollback-page', status: '下書き', locked: false, createdByEditor: true },
    ]),
    [`vm-demo-page-sections-${pageId}`]: JSON.stringify([
      { id: 'delete-rollback-section', type: 'custom-text', label: '復元するセクション', hidden: false, added: true, order: 0, content: { title: '保持する設定' } },
    ]),
  };

  let putCount = 0;
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
      putCount += 1;
      if (putCount === 1) {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'temporarily_unavailable' }),
        });
        return;
      }
      savedEntries = route.request().postDataJSON().entries;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ saved: true }),
      });
      return;
    }
    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  page.on('dialog', (dialog) => dialog.accept());
  await page.goto(pageEditorUrl);

  const pageRow = page.locator('#managed-pages-list .homepage-section-row').filter({ hasText: pageName });
  await expect(pageRow).toBeVisible();
  await pageRow.getByRole('button', { name: '削除' }).click();

  await expect(pageRow).toBeVisible();
  await expect(page.locator('#editor-status')).toContainText('ページ設定のサーバー保存に失敗しました');
  await expect.poll(() => page.evaluate((key) => localStorage.getItem(key), `vm-demo-page-sections-${pageId}`))
    .toBe(savedEntries[`vm-demo-page-sections-${pageId}`]);
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('vm-demo-pages') || '[]').some((item) => item.id === 'delete-rollback-page')))
    .toBe(true);
  await expect.poll(() => Object.hasOwn(savedEntries, 'vm-demo-pages') && JSON.parse(savedEntries['vm-demo-pages']).some((item) => item.id === pageId))
    .toBe(true);
  expect(putCount).toBe(2);
});



test('homepage settings can duplicate a configured custom block without sharing its id', async ({ page }) => {
  let savedHomepageSections = null;
  let savedEntries = {};

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ sections: [], publishedPages: [], themes: {}, pageSettings: {}, siteBranding: {}, siteSettings: {}, announcements: [], homepageTheme: {} }),
    });
  });

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
      savedEntries = { ...savedEntries, ...(payload.entries || {}) };
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ saved: true }),
      });
      return;
    }
    await route.fulfill({ status: 405, body: 'Method not allowed' });
  });

  await page.route('**/api/admin/settings/homepage', async (route) => {
    if (route.request().method() === 'PUT') {
      savedHomepageSections = route.request().postDataJSON().sections;
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
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を読み込みました');

  await page.locator('#top-add-type').selectOption('custom-text');
  await page.locator('#top-add-section').click();
  const original = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '自由ブロック：文章' }).last();
  await original.getByRole('button', { name: '編集' }).click();
  await original.locator('input').nth(0).fill('複製元の見出し');
  await original.locator('textarea').nth(1).fill('複製しても内容を引き継ぎます。');
  await original.getByRole('button', { name: '複製' }).click();

  const copies = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '自由ブロック：文章' });
  await expect(copies).toHaveCount(2);
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました。');

  expect(Array.isArray(savedHomepageSections)).toBe(true);
  const customTexts = savedHomepageSections.filter((section) => section.type === 'custom-text' && section.content?.title === '複製元の見出し');
  expect(customTexts).toHaveLength(2);
  expect(customTexts[0].id).not.toBe(customTexts[1].id);
  expect(customTexts[1].content.body).toBe('複製しても内容を引き継ぎます。');
});

test('homepage renders each published custom page once when API data contains duplicates', async ({ page }) => {
  const publishedPage = {
    id: 'duplicate-published-page',
    name: '重複表示防止テストページ',
    url: '/pages/duplicate-published-page',
    image: '',
    sections: [
      { id: 'published-page-hero', type: 'hero', label: '独立ページのメインビジュアル', content: { title: '独立ページ専用の内容' } },
      { id: 'published-page-custom', type: 'custom-text', label: '独立ページ本文', content: { title: '独立ページ本文の見出し' } },
    ],
  };
  const customPageSection = (id) => ({
    id,
    type: 'custom-page',
    pageId: publishedPage.id,
    label: publishedPage.name,
    hidden: false,
    added: false,
    order: 0,
    content: { title: publishedPage.name, link: publishedPage.url, button: 'ページを見る →' },
  });

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections: [
          customPageSection('duplicate-custom-page-a'),
          customPageSection('duplicate-custom-page-b'),
        ],
        publishedPages: [publishedPage, { ...publishedPage }],
        themes: {},
        pageSettings: {},
        siteBranding: {},
        siteSettings: {},
        announcements: [],
        homepageTheme: {},
      }),
    });
  });

  await page.goto('/');
  const publishedPageSections = page.locator('main .vm-published-page[data-vm-section-type="custom-page"]');
  await expect(publishedPageSections).toHaveCount(1);
  await expect(publishedPageSections.first()).toContainText('重複表示防止テストページ');
  await expect(publishedPageSections.locator('a[href="/pages/duplicate-published-page"]')).toHaveCount(1);
  await expect(publishedPageSections.locator('.hero')).toHaveCount(0);
  await expect(publishedPageSections.locator('.vm-published-page-block-custom-text')).toHaveCount(1);
  await expect(publishedPageSections).toContainText('独立ページ本文の見出し');
  await expect(page.locator('main > .hero')).toHaveCount(1);

  await page.evaluate(() => document.dispatchEvent(new Event('DOMContentLoaded')));
  await expect(publishedPageSections).toHaveCount(1);
  await expect(publishedPageSections.locator('a[href="/pages/duplicate-published-page"]')).toHaveCount(1);
});

test('homepage scopes each published page standard section without duplicating homepage sections', async ({ page }) => {
  const publishedPages = [1, 2, 3].map((index) => ({
    id: `published-page-${index}`,
    name: `独立ページ${index}`,
    url: `/pages/published-page-${index}`,
    image: '',
    sections: [
      { id: `page-${index}-hero`, type: 'hero', label: 'メインビジュアル', content: { title: `ページ${index}のメインビジュアル` } },
      { id: `page-${index}-popular`, type: 'popular', label: '人気の動画', content: { title: `ページ${index}の人気動画` } },
      { id: `page-${index}-custom`, type: 'custom-text', label: '独自コンテンツ', content: { title: `TOPに残す独自内容${index}`, body: 'ページ固有の内容' } },
    ],
  }));
  const sections = publishedPages.map((publishedPage, index) => ({
    id: `homepage-page-link-${index + 1}`,
    type: 'custom-page',
    pageId: publishedPage.id,
    label: publishedPage.name,
    hidden: false,
    added: false,
    order: index,
    content: { title: publishedPage.name, link: publishedPage.url, button: 'ページを見る →' },
  }));

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections,
        publishedPages,
        themes: {},
        pageSettings: {},
        siteBranding: {},
        siteSettings: {},
        announcements: [],
        homepageTheme: {},
      }),
    });
  });

  await page.goto('/');
  const homepagePageSections = page.locator('main .vm-published-page[data-vm-section-type="custom-page"]');
  await expect(homepagePageSections).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    const homepagePageSection = homepagePageSections.nth(index);
    await expect(homepagePageSection.locator(`[data-vm-embedded-page-section="page-${index + 1}-hero"]`)).toHaveCount(1);
    await expect(homepagePageSection.locator(`[data-vm-embedded-page-section="page-${index + 1}-popular"]`)).toHaveCount(1);
    await expect(homepagePageSection.locator('.vm-published-page-block-custom-text')).toHaveCount(1);
    await expect(homepagePageSection).toContainText(`ページ${index + 1}のメインビジュアル`);
    await expect(homepagePageSection).toContainText(`ページ${index + 1}の人気動画`);
    await expect(homepagePageSection).toContainText(`TOPに残す独自内容${index + 1}`);
  }
  await expect(page.locator('main > .hero')).toHaveCount(1);
  await expect(page.locator('main > #popular')).toHaveCount(1);
});

test('homepage renders each configured standard section only once when saved entries repeat with different ids', async ({ page }) => {
  const standardTypes = [
    'hero', 'announcements', 'video-showcase', 'trustbar', 'collection', 'popular',
    'new-releases', 'genre-rail', 'genre-recommendations', 'spotlight', 'finder',
    'categories', 'library', 'creator', 'creators', 'cta',
  ];
  const selectors = {
    hero: 'main > .hero',
    announcements: 'main > #announcements',
    'video-showcase': 'main > .video-showcase',
    trustbar: 'main > .trustbar',
    collection: 'main > #collection',
    popular: 'main > #popular',
    'new-releases': 'main > #new-releases',
    'genre-rail': 'main > .genre-rail',
    'genre-recommendations': 'main > .genre-recommendations',
    spotlight: 'main > .spotlight',
    finder: 'main > #search',
    categories: 'main > #categories',
    library: 'main > #library',
    creator: 'main > #creator',
    creators: 'main > #creators',
    cta: 'main > .cta',
  };
  const sections = [];
  for (let copy = 0; copy < 3; copy += 1) {
    standardTypes.forEach((type) => {
      sections.push({
        id: `repeated-${type}-${copy + 1}`,
        type,
        label: type,
        hidden: false,
        order: sections.length,
        content: {},
      });
    });
  }

  await page.route('**/api/site/homepage-settings', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        sections,
        publishedPages: [],
        themes: {},
        pageSettings: {},
        siteBranding: {},
        siteSettings: {},
        announcements: [],
        homepageTheme: {},
      }),
    });
  });

  await page.goto('/');
  for (const type of standardTypes) {
    await expect(page.locator(selectors[type])).toHaveCount(1);
  }
  await page.reload();
  for (const type of standardTypes) {
    await expect(page.locator(selectors[type])).toHaveCount(1);
  }
});
