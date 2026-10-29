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

  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');

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
    await expect(page.locator(`.vm-homepage-${block.type}`)).toBeVisible();
    if (block.title) {
      await expect(page.locator(`.vm-homepage-${block.type}`).getByRole('heading', { name: block.title })).toBeVisible();
    }
  }
  await expect(page.locator('.vm-homepage-custom-text')).toContainText('公開される自由な本文です。');
  await expect(page.locator('.vm-homepage-custom-image-text')).toContainText('画像と一緒に表示する本文です。');
  await expect(page.locator('.vm-homepage-custom-image img')).toHaveCSS('object-fit', 'contain');
  await expect(page.locator('.vm-homepage-custom-image img')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('.vm-homepage-custom-button a')).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(page.locator('.vm-homepage-custom-button a')).toHaveCSS('border-radius', '0px');
  await expect(page.locator('.vm-homepage-custom-gallery')).toContainText('写真A');
  await expect(page.locator('.vm-homepage-custom-cards')).toContainText('動画講座');

  const grid = page.locator('.vm-homepage-custom-cards .vm-homepage-custom-grid');
  const columnCount = async () => page.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(' ').length, await grid.elementHandle());
  expect(await columnCount()).toBe(4);
  await page.setViewportSize({ width: 800, height: 900 });
  expect(await columnCount()).toBe(3);
  await page.setViewportSize({ width: 600, height: 900 });
  expect(await columnCount()).toBe(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await columnCount()).toBe(1);
});

test('homepage custom-page layout selection persists and controls public rendering', async ({ page }) => {
  const publishedPage = { id: 'layout-persistence-page', name: 'レイアウト保存テスト', url: '/pages/layout-persistence-page', image: '', sections: [{ id: 'page-popular', type: 'popular', label: 'ページ内の人気動画', content: { settings: { videoCount: 4, columns: 2 } }, settings: { videoCount: 4, columns: 2 }, theme: { bg: '#123456', text: '#ffffff', accent: '#abcdef', width: 'narrow', spacing: 'large', radius: 'square', imageFit: 'contain', buttonText: '#222222' }, items: [] }, { id: 'page-video-showcase', type: 'video-showcase', label: 'ページ内の作品紹介', content: { settings: { layout: 'grid', videoCount: 3 } }, items: [] }, { id: 'page-intro', type: 'custom-text', label: 'ページ本文', content: { title: '埋め込みセクション', subtitle: 'TOPに反映される本文', body: '独立ページで保存した内容です。' }, theme: { bg: '#234567', text: '#eeeeee', width: 'wide', spacing: 'compact' }, items: [] }, { id: 'page-genre-rail', type: 'genre-rail', label: 'ページ内ジャンル', content: { settings: { layout: 'grid', genreCount: 3 } }, items: [] }] };
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
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-popular"] h2')).toContainText('ページ内の人気動画');
  const embeddedPopular = page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-popular"]');
  await expect(embeddedPopular).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(embeddedPopular).toHaveCSS('color', 'rgb(255, 255, 255)');
  await expect(embeddedPopular).toHaveCSS('max-width', '900px');
  await expect(embeddedPopular).toHaveCSS('padding-top', '48px');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-genre-rail"] .genre-track')).toHaveCSS('display', 'grid');
  await expect(page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-genre-rail"] .genre-track')).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  const embeddedShowcaseGrid = page.locator('[data-vm-section-type="custom-page"] [data-vm-embedded-page-section="page-video-showcase"] .video-showcase-grid');
  await expect(embeddedShowcaseGrid).toHaveCSS('grid-template-columns', /\S+\s+\S+/);
  await expect(page.locator('[data-vm-section-type="custom-page"] .vm-published-page-block-custom-text')).toContainText('埋め込みセクション');
  await expect(page.locator('[data-vm-section-type="custom-page"] .vm-published-page-block-custom-text')).toContainText('独立ページで保存した内容です。');
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
    id: 'custom-banner',
    type: 'custom-text',
    label: '自由ブロックテスト',
    hidden: false,
    added: true,
    order: 2,
    content: {
      title: '自由ブロックのテーマ確認',
      body: '保存したデザインが公開TOPに反映されます。',
      theme: { bg: '#234567', text: '#eeeeee', accent: '#abcdef', width: 'narrow', spacing: 'compact', radius: 'square' },
    },
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

  const reorderGenreRow = page.locator('#top-settings-list .homepage-section-row').filter({ hasText: '気分から選ぶ' }).first();
  await reorderGenreRow.getByRole('button', { name: '↑' }).click();
  await page.locator('#top-save-settings').click();
  await expect(page.locator('#top-settings-status')).toContainText('TOP設定を保存しました');
  expect(savedSections.slice(0, 3).map((section) => section.id)).toEqual(['genre-rail', 'popular', 'custom-banner']);
  expect(savedSections.slice(0, 3).map((section) => section.order)).toEqual([0, 1, 2]);

  await page.goto('/');
  const publicSection = page.locator('#popular');
  await expect(publicSection).toBeVisible();
  await expect(publicSection).toHaveCSS('text-align', 'center');
  await expect(publicSection).toHaveCSS('background-color', 'rgb(18, 52, 86)');
  await expect(publicSection).toHaveCSS('max-width', 'none');
  await expect(page.locator('#videos .video-card:visible')).toHaveCount(4);
  await expect(page.locator('#videos')).toHaveCSS('grid-template-columns', /repeat\(4,/);
  await expect(page.locator('.genre-rail .genre-track')).toHaveCSS('display', 'grid');
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
