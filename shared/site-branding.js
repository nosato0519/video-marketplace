/* Shared site branding, homepage settings, and public announcement rendering. */
(function () {
  "use strict";

  const STORAGE_KEY = "vm-demo-site-branding";
  const originalTitle = document.title;
  const MAX_LOGO_BYTES = 450 * 1024;
  const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

  function readSettings() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      return value && typeof value === "object" ? value : {};
    } catch (_) {
      return {};
    }
  }

  let publicSettingsPromise = null;
  function getPublicSettings() {
    if (!publicSettingsPromise) {
      publicSettingsPromise = fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" })
        .then(function (response) {
          if (!response.ok) throw new Error("public_settings_unavailable");
          return response.json();
        })
        .catch(function (error) {
          publicSettingsPromise = null;
          throw error;
        });
    }
    return publicSettingsPromise;
  }

  function splitName(name) {
    const clean = String(name || "").trim();
    const firstSpace = clean.indexOf(" ");
    return firstSpace < 0
      ? { primary: clean, secondary: "" }
      : { primary: clean.slice(0, firstSpace), secondary: clean.slice(firstSpace + 1) };
  }

  function applyBranding(settings) {
    const siteName = String(settings.siteName || "").trim();
    if (siteName) {
      const parts = splitName(siteName);
      document.querySelectorAll(".logo-wordmark").forEach(function (wordmark) {
        const primary = wordmark.querySelector("b");
        const secondary = wordmark.querySelector("i");
        if (primary) primary.textContent = parts.primary;
        if (secondary) {
          secondary.textContent = parts.secondary;
          secondary.hidden = !parts.secondary;
        }
      });
      document.querySelectorAll(".logo[aria-label]").forEach(function (logo) {
        logo.setAttribute("aria-label", siteName);
      });
      document.querySelectorAll("meta[name='application-name']").forEach(function (meta) {
        meta.content = siteName;
      });
      document.title = originalTitle.replace(/VIDEO MARKETPLACE/gi, siteName || "VIDEO MARKETPLACE");
    }

    document.querySelectorAll(".logo").forEach(function (logo) {
      let image = logo.querySelector(".site-brand-image");
      const symbol = logo.querySelector(".logo-symbol");
      if (settings.logoDataUrl) {
        if (!image) {
          image = document.createElement("img");
          image.className = "site-brand-image";
          image.alt = "";
          image.style.cssText = "display:block;max-width:180px;max-height:42px;width:auto;height:auto;object-fit:contain;";
          logo.insertBefore(image, logo.firstChild);
        }
        image.src = settings.logoDataUrl;
        if (symbol) { symbol.hidden = true; symbol.style.setProperty("display", "none", "important"); }
      } else {
        if (image) image.remove();
        if (symbol) { symbol.hidden = false; symbol.style.removeProperty("display"); }
      }
    });
  }

  function installSettingsForm() {
    const form = document.getElementById("settings-form");
    if (!form || !document.getElementById("site-logo-file")) return;

    const nameInput = form.elements.siteName;
    const fileInput = document.getElementById("site-logo-file");
    const preview = document.getElementById("brand-preview");
    const previewImage = document.getElementById("brand-preview-image");
    const previewName = document.getElementById("brand-preview-name");
    const status = document.getElementById("save-status");
    const reset = document.getElementById("reset-settings");
    const initialName = nameInput.value;
    const defaultFormValues = Array.from(form.elements).filter(function (field) { return field.name; }).map(function (field) {
      return { name: field.name, value: field.value, checked: field.checked, type: field.type };
    });
    let logoDataUrl = readSettings().logoDataUrl || "";

    function renderPreview() {
      const name = String(nameInput.value || "").trim() || initialName;
      previewName.textContent = name;
      previewImage.hidden = !logoDataUrl;
      previewImage.src = logoDataUrl || "";
      preview.classList.toggle("has-logo", Boolean(logoDataUrl));
    }

    nameInput.addEventListener("input", renderPreview);
    fileInput.addEventListener("change", function () {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      if (!ALLOWED_LOGO_TYPES.includes(file.type) || file.size > MAX_LOGO_BYTES) {
        fileInput.value = "";
        status.textContent = "PNG・JPEG・WebP・SVG、450KB以下の画像を選択してください。";
        return;
      }
      const reader = new FileReader();
      reader.onload = function () {
        logoDataUrl = String(reader.result || "");
        renderPreview();
        status.textContent = "プレビューを更新しました。保存するとこのブラウザに反映されます。";
      };
      reader.onerror = function () {
        status.textContent = "画像を読み込めませんでした。別の画像をお試しください。";
      };
      reader.readAsDataURL(file);
    });

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      const siteName = String(nameInput.value || "").trim();
      if (!siteName) {
        status.textContent = "サイト名を入力してください。";
        nameInput.focus();
        return;
      }
      try {
        const settings = { siteName: siteName, logoDataUrl: logoDataUrl };
        const siteFormSettings = {};
        Array.from(form.elements).filter(function (field) { return field.name; }).forEach(function (field) {
          siteFormSettings[field.name] = field.type === "checkbox" ? field.checked : field.value;
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        localStorage.setItem("vm-demo-admin-setting-general", JSON.stringify(siteFormSettings));
        applyBranding(settings);
        renderPreview();
        status.textContent = "サーバーに保存しています…";
        fetch("/api/admin/settings/page-editor", {
          method: "PUT",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merge: true, entries: {
            "vm-demo-site-branding": JSON.stringify(settings),
            "vm-demo-admin-setting-general": JSON.stringify(siteFormSettings)
          } })
        }).then(function (response) {
          if (!response.ok) throw new Error("site_settings_save_failed");
          status.textContent = "サイト基本設定を保存し、公開サイトに反映しました。";
        }).catch(function () {
          status.textContent = "サーバー保存に失敗しました。運営者ログイン状態とサーバーログを確認してください。";
        });
      } catch (_) {
        status.textContent = "保存できませんでした。画像サイズを小さくしてお試しください。";
      }
    });

    reset.addEventListener("click", function () {
      try { localStorage.removeItem(STORAGE_KEY); localStorage.removeItem("vm-demo-admin-setting-general"); } catch (_) {}
      defaultFormValues.forEach(function (saved) {
        const field = Array.from(form.elements).find(function (item) { return item.name === saved.name && item.type !== "radio"; });
        if (!field) return;
        if (field.type === "checkbox") field.checked = saved.checked;
        else field.value = saved.value;
      });
      logoDataUrl = "";
      nameInput.value = initialName;
      fileInput.value = "";
      const defaultSettings = {};
      Array.from(form.elements).filter(function (field) { return field.name; }).forEach(function (field) {
        defaultSettings[field.name] = field.type === "checkbox" ? field.checked : field.value;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ siteName: initialName, logoDataUrl: "" }));
      localStorage.setItem("vm-demo-admin-setting-general", JSON.stringify(defaultSettings));
      applyBranding({ siteName: initialName, logoDataUrl: "" });
      renderPreview();
      status.textContent = "初期設定をサーバーに保存しています…";
      fetch("/api/admin/settings/page-editor", {
        method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merge: true, entries: {
          "vm-demo-site-branding": JSON.stringify({ siteName: initialName, logoDataUrl: "" }),
          "vm-demo-admin-setting-general": JSON.stringify(defaultSettings)
        } })
      }).then(function (response) {
        if (!response.ok) throw new Error("site_settings_reset_failed");
        status.textContent = "初期設定をサーバーに保存しました。";
      }).catch(function () { status.textContent = "初期設定のサーバー保存に失敗しました。"; });
    });

    const saved = readSettings();
    if (saved.siteName) nameInput.value = saved.siteName;
    logoDataUrl = saved.logoDataUrl || "";
    renderPreview();
    getPublicSettings()
      .then(function (data) {
        if (!data) return;
        const serverBranding = data.siteBranding || {};
        const serverSettings = data.siteSettings || {};
        if (serverBranding.siteName || serverSettings.siteName) nameInput.value = serverBranding.siteName || serverSettings.siteName;
        if (Object.keys(serverSettings).length) {
          Array.from(form.elements).filter(function (field) { return field.name && field.name in serverSettings; }).forEach(function (field) {
            if (field.type === "checkbox") field.checked = !!serverSettings[field.name];
            else field.value = serverSettings[field.name];
          });
        }
        if (serverBranding.siteName || serverBranding.logoDataUrl) {
          logoDataUrl = serverBranding.logoDataUrl || "";
          localStorage.setItem(STORAGE_KEY, JSON.stringify(serverBranding));
          applyBranding(serverBranding);
        }
        renderPreview();
      }).catch(function () {});
  }



  function renderPublicAnnouncements(items) {
    const published = (Array.isArray(items) ? items : [])
      .filter(function (item) { return item && item.status === "published" && typeof item.title === "string"; })
      .sort(function (left, right) { return String(right.date || "").localeCompare(String(left.date || "")); });
    const homeList = document.getElementById("vm-announcement-list");
    if (homeList) {
      homeList.replaceChildren();
      published.slice(0, 3).forEach(function (item) {
        const link = document.createElement("a");
        link.className = "vm-announcement-item";
        link.href = "/pages/announcements.html?id=" + encodeURIComponent(item.id || "");
        link.innerHTML = '<time class="vm-announcement-date"></time><div class="vm-announcement-main"><strong></strong><span></span></div><b class="vm-announcement-arrow">→</b>';
        link.querySelector("time").textContent = item.date || "";
        link.querySelector("strong").textContent = item.title;
        link.querySelector("span").textContent = item.category || "お知らせ";
        homeList.appendChild(link);
      });
      if (!homeList.children.length) homeList.innerHTML = '<p class="announcement-empty">現在、お知らせはありません。</p>';
    }
    const newsList = document.getElementById("news-list");
    const detailView = document.getElementById("detail-view");
    const listView = document.getElementById("list-view");
    if (!newsList || !listView || !detailView) return;
    const id = new URLSearchParams(window.location.search).get("id");
    const selected = published.find(function (item) { return item.id === id; });
    newsList.replaceChildren();
    if (id && selected) {
      listView.style.display = "none";
      detailView.style.display = "block";
      document.getElementById("detail-title").textContent = selected.title;
      document.getElementById("detail-meta").textContent = (selected.category || "お知らせ") + "　•　" + (selected.date || "");
      document.getElementById("detail-body").textContent = selected.body || "";
      return;
    }
    listView.style.display = "";
    detailView.style.display = "none";
    if (!published.length) {
      newsList.innerHTML = "<p>現在、お知らせはありません。</p>";
      return;
    }
    published.forEach(function (item) {
      const link = document.createElement("a");
      link.className = "news-card";
      link.href = "?id=" + encodeURIComponent(item.id || "");
      link.innerHTML = '<div class="news-meta"><time></time><span></span></div><strong></strong><p></p>';
      link.querySelector("time").textContent = item.date || "";
      link.querySelector("span").textContent = item.category || "お知らせ";
      link.querySelector("strong").textContent = item.title;
      const body = String(item.body || "");
      link.querySelector("p").textContent = body.slice(0, 100) + (body.length > 100 ? "…" : "");
      newsList.appendChild(link);
    });
  }

  async function syncPublicSettings() {
    try {
      const data = await getPublicSettings();
      applySiteChrome(data.pageSettings && data.pageSettings.chrome);
      if (data.siteBranding && Object.keys(data.siteBranding).length) applyBranding(data.siteBranding);
      const siteDescription = data.siteSettings && String(data.siteSettings.f1 || "").trim();
      if (siteDescription) {
        let meta = document.querySelector('meta[name="description"]');
        if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
        meta.content = siteDescription;
      }
      renderPublicAnnouncements(data.announcements);
    } catch (_) {}
  }

  function installGlobalChromeForm() {
    const form = document.getElementById("site-chrome-form");
    if (!form) return;
    const status = document.getElementById("site-chrome-status");
    const fields = Array.from(form.elements).filter(function (field) { return field.name; });
    function apply(values) {
      fields.forEach(function (field) {
        if (!(field.name in values)) return;
        if (field.type === "checkbox") field.checked = values[field.name] !== false;
        else field.value = values[field.name];
      });
    }
    getPublicSettings()
      .then(function (data) {
        const chrome = data && data.pageSettings && data.pageSettings.chrome;
        if (chrome && typeof chrome === "object") apply(chrome);
        status.textContent = "共通表示設定を読み込みました。";
      })
      .catch(function () { status.textContent = "共通表示設定を読み込めませんでした。"; });
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      const values = {};
      fields.forEach(function (field) {
        values[field.name] = field.type === "checkbox" ? field.checked : field.value;
      });
      status.textContent = "共通表示設定をサーバーに保存しています…";
      const button = form.querySelector('button[type="submit"]');
      if (button) button.disabled = true;
      try {
        const response = await fetch("/api/admin/settings/page-editor", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merge: true, entries: { "vm-demo-site-chrome": JSON.stringify(values) } })
        });
        if (!response.ok) throw new Error("site_chrome_save_failed");
        localStorage.setItem("vm-demo-site-chrome", JSON.stringify(values));
        status.textContent = "共通表示設定を保存しました。公開サイトに反映されます。";
      } catch (_) {
        status.textContent = "保存に失敗しました。運営者ログイン状態とサーバーログを確認してください。";
      } finally {
        if (button) button.disabled = false;
      }
    });
  }

  function installTopSettingsEditor() {
    const root = document.getElementById("top-settings-list");
    if (!root) return;
    const status = document.getElementById("top-settings-status");
    const select = document.getElementById("top-add-type");
    const definitions = [
      ["hero","メインビジュアル"],["announcements","お知らせ"],["video-showcase","作品紹介"],
      ["trustbar","安心・購入ガイド"],["collection","動画コレクション"],["popular","人気の動画"],
      ["new-releases","新着動画"],["genre-rail","カテゴリー・ジャンル"],
      ["genre-recommendations","ジャンル別おすすめ"],["spotlight","おすすめ特集"],
      ["finder","動画を探す"],["categories","カテゴリー一覧"],["library","ライブラリ紹介"],
      ["creator","クリエイター向け案内"],["creators","注目のクリエイター"],["cta","最後の案内"]
    ].map(function (item) { return { type: item[0], label: item[1] }; });
    const customDefinitions = [
      ["custom-text", "自由ブロック：文章"],
      ["custom-image", "自由ブロック：画像"],
      ["custom-image-text", "自由ブロック：画像＋文章"],
      ["custom-gallery", "自由ブロック：画像ギャラリー"],
      ["custom-cards", "自由ブロック：カード一覧"],
      ["custom-button", "自由ブロック：ボタン"],
      ["custom-divider", "自由ブロック：区切り線"],
      ["custom-spacer", "自由ブロック：余白"]
    ].map(function (item) { return { type: item[0], label: item[1] }; });
    const allDefinitions = definitions.concat(customDefinitions);
    const customTypes = new Set(customDefinitions.map(function (item) { return item.type; }));
    let sections = [];
    function normalize(items, publishedPages) {
      const source = Array.isArray(items) ? items : [];
      const seenIds = new Set();
      const seenTypes = new Set();
      const normalized = source.filter(function (item) {
        if (!item || typeof item !== "object") return false;
        const id = typeof item.id === "string" && item.id ? item.id : item.type;
        if (typeof id !== "string" || !id || seenIds.has(id)) return false;
        if (item.type === "custom-page") {
          if (!publishedPages.some(function (page) { return page.id === item.pageId; })) return false;
          seenIds.add(id);
          return true;
        }
        if (!allDefinitions.some(function (def) { return def.type === item.type; })) return false;
        seenIds.add(id);
        if (item.added !== true && seenTypes.has(item.type)) return false;
        seenTypes.add(item.type);
        return true;
      }).map(function (item, index) {
        const def = definitions.find(function (entry) { return entry.type === item.type; });
        return Object.assign({}, item, {
          id: item.id || item.type,
          label: item.label || (def && def.label) || item.type,
          hidden: item.hidden === true,
          order: index,
          content: item.content && typeof item.content === "object" ? item.content : {}
        });
      });

      // Older saved configurations can contain only newly added sections.
      // Restore any missing standard sections so they remain reorderable.
      definitions.forEach(function (def) {
        if (seenTypes.has(def.type)) return;
        normalized.push({
          id: def.type,
          type: def.type,
          label: def.label,
          hidden: false,
          added: false,
          order: normalized.length,
          content: {}
        });
        seenTypes.add(def.type);
      });

      (Array.isArray(publishedPages) ? publishedPages : []).forEach(function (page) {
        if (!page || typeof page.id !== "string" || typeof page.name !== "string" || typeof page.url !== "string") return;
        if (normalized.some(function (item) { return item.type === "custom-page" && item.pageId === page.id; })) return;
        normalized.push({
          id: "custom-page-" + page.id,
          type: "custom-page",
          pageId: page.id,
          label: page.name,
          hidden: false,
          added: false,
          order: normalized.length,
          content: { title: page.name, link: page.url }
        });
      });

      return normalized.map(function (item, index) {
        return Object.assign({}, item, { order: index });
      });
    }
    function field(labelText, key, value, item, multiline) {
      const label = document.createElement("label");
      label.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
      label.appendChild(document.createTextNode(labelText));
      const input = document.createElement(multiline ? "textarea" : "input");
      if (!multiline) input.type = "text";
      if (multiline) input.rows = 2;
      if (key === "itemsText") {
        const existingItems = Array.isArray(item.content.items) ? item.content.items : [];
        input.value = item.content.itemsText || existingItems.map(function (entry) {
          return [entry.title || "", entry.description || "", entry.image || "", entry.link || ""].join("|");
        }).join("\n");
      } else {
        input.value = value || "";
      }
      input.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
      input.addEventListener("input", function () {
        item.content[key] = input.value;
        if (key === "itemsText") {
          item.content.items = input.value.split(/\r?\n/).map(function (line) {
            const parts = line.split("|").map(function (part) { return part.trim(); });
            return { title: parts[0] || "", description: parts[1] || "", image: parts[2] || "", link: parts[3] || "" };
          }).filter(function (entry) { return entry.title || entry.description || entry.image || entry.link; });
        }
      });
      label.appendChild(input);
      return label;
    }
    function render() {
      root.replaceChildren();
      sections.forEach(function (item, index) {
        const row = document.createElement("div");
        row.className = "homepage-section-row" + (item.hidden ? " is-hidden" : "");
        row.style.cssText = "display:grid;gap:12px;padding:14px;margin-bottom:10px;border:1px solid var(--line,#333);border-radius:10px;";
        const head = document.createElement("div");
        head.style.cssText = "display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;";
        const title = document.createElement("strong");
        title.textContent = item.label || (definitions.find(function (def) { return def.type === item.type; }) || {}).label || item.type;
        head.appendChild(title);
        const actions = document.createElement("div");
        actions.className = "policy-actions";
        function button(label, disabled, callback, primary) {
          const element = document.createElement("button");
          element.type = "button";
          element.className = "btn" + (primary ? " primary" : "");
          element.textContent = label;
          element.disabled = disabled;
          element.addEventListener("click", callback);
          actions.appendChild(element);
          return element;
        }
        button("↑", index === 0, function () { [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]]; render(); });
        button("↓", index === sections.length - 1, function () { [sections[index + 1], sections[index]] = [sections[index], sections[index + 1]]; render(); });
        button(item.hidden ? "表示する" : "非表示にする", false, function () { item.hidden = !item.hidden; render(); });
        const deleteButton = button("削除", item.added !== true || item.type === "custom-page", function () { sections = sections.filter(function (section) { return section.id !== item.id; }); render(); });
        head.appendChild(actions);
        row.appendChild(head);
        const contentDetails = document.createElement("details");
        contentDetails.style.cssText = "display:none;border-top:1px solid var(--line,#333);padding-top:10px;";
        const editButton = document.createElement("button");
        editButton.type = "button";
        editButton.className = "btn";
        editButton.textContent = "編集";
        editButton.setAttribute("aria-expanded", "false");
        editButton.addEventListener("click", function () {
          contentDetails.open = !contentDetails.open;
          contentDetails.style.display = contentDetails.open ? "block" : "none";
          editButton.textContent = contentDetails.open ? "閉じる" : "編集";
          editButton.setAttribute("aria-expanded", String(contentDetails.open));
        });
        actions.insertBefore(editButton, deleteButton);
        const fields = document.createElement("div");
        fields.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-top:12px;";
        fields.append(
          field("見出し", "title", item.content.title, item, false),
          field("説明", "subtitle", item.content.subtitle, item, true),
          field("ボタン表示", "button", item.content.button, item, false),
          field("リンク先", "link", item.content.link, item, false),
          field("画像URL", "image", item.content.image, item, false)
        );
        if (item.type === "custom-text" || item.type === "custom-image-text") {
          fields.appendChild(field("本文", "body", item.content.body, item, true));
        }
        if (customTypes.has(item.type)) {
          const layout = document.createElement("label");
          layout.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
          layout.appendChild(document.createTextNode("表示レイアウト"));
          const layoutSelect = document.createElement("select");
          layoutSelect.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
          [
            ["standard", "標準"],
            ["wide", "幅広"],
            ["narrow", "幅を狭く"],
            ["center", "中央揃え"]
          ].forEach(function (optionData) {
            const option = document.createElement("option");
            option.value = optionData[0];
            option.textContent = optionData[1];
            layoutSelect.appendChild(option);
          });
          layoutSelect.value = item.content.layout || "standard";
          layoutSelect.addEventListener("change", function () { item.content.layout = layoutSelect.value; });
          fields.appendChild(layout);
          layout.appendChild(layoutSelect);
        }
        if (item.type === "custom-gallery" || item.type === "custom-cards") {
          const columnsLabel = document.createElement("label");
          columnsLabel.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
          columnsLabel.appendChild(document.createTextNode("1行の表示数"));
          const columnsSelect = document.createElement("select");
          columnsSelect.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
          [["2","2列"],["3","3列"],["4","4列"],["5","5列"]].forEach(function (optionData) {
            const option = document.createElement("option");
            option.value = optionData[0];
            option.textContent = optionData[1];
            columnsSelect.appendChild(option);
          });
          columnsSelect.value = String(item.content.columns || 3);
          columnsSelect.addEventListener("change", function () { item.content.columns = Number(columnsSelect.value); });
          fields.appendChild(columnsLabel);
          columnsLabel.appendChild(columnsSelect);
          fields.appendChild(field("項目（1行ごとに「タイトル|説明|画像URL|リンク先」）", "itemsText", item.content.itemsText, item, true));
        }
        contentDetails.appendChild(fields);
        row.appendChild(contentDetails);
        root.appendChild(row);
      });
    }
    async function load() {
      status.textContent = "サーバーからTOP設定を読み込んでいます…";
      try {
        const data = await getPublicSettings();
        sections = normalize(data.sections, data.publishedPages);
        render();
        status.textContent = "TOP設定を読み込みました。公開済みの独立ページも一覧に含めています。";
      } catch (_) {
        sections = normalize([], []);
        render();
        status.textContent = "サーバーから読み込めませんでした。運営者ログイン状態を確認してください。";
      }
    }
    const add = document.getElementById("top-add-section");
    if (add) add.addEventListener("click", function () {
      const def = allDefinitions.find(function (item) { return item.type === select.value; });
      if (!def) return;
      const id = def.type + "-added-" + Date.now();
      sections.push({ id: id, type: def.type, label: def.label, hidden: false, added: true, order: sections.length, content: {} });
      render();
    });
    const save = document.getElementById("top-save-settings");
    if (save) save.addEventListener("click", async function () {
      sections = sections.map(function (item, index) { return Object.assign({}, item, { order: index }); });
      const serialized = JSON.stringify(sections);
      status.textContent = "TOP設定をサーバーに保存しています…";
      save.disabled = true;
      try {
        const editorResponse = await fetch("/api/admin/settings/page-editor", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merge: true, entries: {
            "vm-demo-page-sections-top": serialized,
            "vm-demo-homepage-sections": serialized
          } })
        });
        if (!editorResponse.ok) throw new Error("page_editor_save_failed");
        const homepageResponse = await fetch("/api/admin/settings/homepage", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: sections })
        });
        if (!homepageResponse.ok) throw new Error("homepage_save_failed");
        localStorage.setItem("vm-demo-page-sections-top", serialized);
        localStorage.setItem("vm-demo-homepage-sections", serialized);
        status.textContent = "TOP設定を保存しました。公開TOPに反映されます。";
      } catch (_) {
        status.textContent = "保存に失敗しました。運営者ログイン状態とサーバーログを確認してください。";
      } finally {
        save.disabled = false;
      }
    });
    load();
  }

  async function installSessionNavigation() {
    const menus = document.querySelectorAll(".login-menu");
    if (!menus.length) return;

    try {
      const response = await fetch("/api/auth/me", { credentials: "same-origin" });
      if (!response.ok) return;

      const data = await response.json();
      const user = data?.user;
      if (!user?.role) return;

      const destinations = {
        seller: "/seller/dashboard.html",
        buyer: "/pages/buyer.html",
        admin: "/pages/admin.html",
      };
      const labels = {
        seller: "販売者ページ",
        buyer: "購入者ページ",
        admin: "運営者ページ",
      };
      const destination = destinations[user.role];
      const label = labels[user.role];
      if (!destination || !label) return;

      menus.forEach(function (menu) {
        menu.innerHTML = `
          <a class="login-trigger login-account-link" href="${destination}">${label}</a>
          <button class="login-trigger login-logout-link" type="button">ログアウト</button>
        `;

        const logout = menu.querySelector(".login-logout-link");
        logout.addEventListener("click", async function () {
          logout.disabled = true;
          try {
            const logoutResponse = await fetch("/api/auth/logout", {
              method: "POST",
              credentials: "same-origin",
            });
            if (!logoutResponse.ok) throw new Error("Logout failed");
            window.location.assign("/");
          } catch (_) {
            logout.disabled = false;
          }
        });
      });
    } catch (_) {}
  }


  function applySiteChrome(chrome) {
    if (!chrome || typeof chrome !== "object") return;
    const navs = document.querySelectorAll(".nav-right nav, .page-published-nav");
    const selectors = {
      cart: 'a[href*="cart"]',
      purchase: 'a[href*="video-list"], a[href*="browse"], a[href*="library"]',
      sell: 'a[href*="seller"], a[href*="creator"]',
      account: 'a[href*="login"], a[href*="account"]'
    };
    navs.forEach(function (nav) {
      if (typeof chrome.menuOrder === "string") {
        chrome.menuOrder.split(",").forEach(function (name) {
          if (!Object.prototype.hasOwnProperty.call(selectors, name)) return;
          const link = Array.from(nav.querySelectorAll("[data-site-nav]"))
            .find(function (item) { return item.dataset.siteNav === name; }) || nav.querySelector(selectors[name]);
          if (link) nav.appendChild(link);
        });
      }
      Object.keys(selectors).forEach(function (name) {
        const link = nav.querySelector('[data-site-nav="' + name + '"]') || nav.querySelector(selectors[name]);
        if (link) link.hidden = chrome[({cart:"showCart",purchase:"showPurchase",sell:"showSell",account:"showAccount"})[name]] === false;
      });
    });
    if (chrome.showAccount === false) {
      document.querySelectorAll(".login-menu, .login-dropdown").forEach(function (element) { element.hidden = true; });
    }
    const footerLinks = document.querySelector(".footer-cols");
    if (footerLinks) footerLinks.hidden = chrome.footerShowLinks === "hide";
    const copyright = document.getElementById("site-footer-copyright");
    if (copyright && typeof chrome.footerCopyright === "string") copyright.textContent = chrome.footerCopyright;
    const description = document.getElementById("site-footer-description");
    if (description && typeof chrome.footerDescription === "string") description.textContent = chrome.footerDescription;
  }

  async function syncHomepageSections() {
    if (!document.querySelector("main") || !document.querySelector(".hero")) return;
    try {
      const data = await getPublicSettings();
      applySiteChrome(data.pageSettings && data.pageSettings.chrome);
      const sections = Array.isArray(data.sections) ? data.sections : [];
      const pageSettings = data.pageSettings || {};
      const homepageTheme = data.homepageTheme || {};
      if (typeof homepageTheme.bg === "string" && /^#[0-9a-f]{6}$/i.test(homepageTheme.bg)) document.documentElement.style.setProperty("--bg", homepageTheme.bg);
      if (typeof homepageTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(homepageTheme.accent)) document.documentElement.style.setProperty("--accent", homepageTheme.accent);
      if (homepageTheme.radius === "square") document.body.classList.add("vm-square-cards");
      else document.body.classList.remove("vm-square-cards");
      const heroSettings = pageSettings.meta && pageSettings.meta.hero;
      if (heroSettings && typeof heroSettings === "object") {
        const hero = document.querySelector(".hero");
        const kicker = hero && hero.querySelector(".eyebrow");
        const heading = hero && hero.querySelector("h1");
        const copy = hero && hero.querySelector(".hero-copy > p");
        const button = hero && hero.querySelector(".actions a.primary");
        const background = hero && hero.querySelector(".hero-bg");
        if (kicker && typeof heroSettings.kicker === "string" && heroSettings.kicker.trim()) kicker.textContent = heroSettings.kicker;
        if (heading && typeof heroSettings.headline === "string" && heroSettings.headline.trim()) {
          heading.textContent = heroSettings.headline;
          heading.style.whiteSpace = "pre-line";
        }
        if (copy && typeof heroSettings.copy === "string" && heroSettings.copy.trim()) copy.textContent = heroSettings.copy;
        if (button && typeof heroSettings.buttonLabel === "string" && heroSettings.buttonLabel.trim()) button.textContent = heroSettings.buttonLabel;
        if (button && typeof heroSettings.buttonUrl === "string" && heroSettings.buttonUrl.startsWith("/")) button.href = heroSettings.buttonUrl;
        if (background && typeof heroSettings.backgroundImage === "string" && heroSettings.backgroundImage.trim()) {
          try {
            const target = new URL(heroSettings.backgroundImage, window.location.origin);
            if (target.origin === window.location.origin || ["https:", "http:"].includes(target.protocol)) {
              background.style.backgroundImage = 'url("' + target.href.replace(/["\\\\]/g, "") + '")';
              background.style.backgroundPosition = ["center", "left", "right", "top", "bottom"].includes(heroSettings.imagePosition) ? heroSettings.imagePosition : "center";
              background.style.backgroundSize = ["cover", "contain"].includes(heroSettings.imageFit) ? heroSettings.imageFit : "cover";
            }
          } catch (_) {}
        }
      }
      const design = pageSettings.design || {};
      const main = document.querySelector("main");
      if (main) {
        if (typeof design.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(design.bg)) main.style.backgroundColor = design.bg;
        if (typeof design.text === "string" && /^#[0-9a-f]{3,8}$/i.test(design.text)) main.style.color = design.text;
        if (typeof design.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(design.accent)) main.style.setProperty("--preview-accent", design.accent);
        if (typeof design.contentWidth === "string") {
          main.style.maxWidth = design.contentWidth === "narrow" ? "1100px" : design.contentWidth === "wide" ? "none" : "";
          if (design.contentWidth === "narrow") main.style.marginInline = "auto";
        }
      }
      main.querySelectorAll("[data-vm-section-id][data-vm-section-type]").forEach(function (element) {
        if (element.dataset.vmSectionId !== element.dataset.vmSectionType) element.remove();
        else {
          element.hidden = false;
          element.style.removeProperty("display");
          element.setAttribute("aria-hidden", "false");
        }
      });
      const definitions = [
        { key: "hero", selector: ".hero" },
        { key: "announcements", selector: "#announcements" },
        { key: "video-showcase", selector: ".video-showcase" },
        { key: "trustbar", selector: ".trustbar" },
        { key: "collection", selector: "#collection" },
        { key: "popular", selector: "#popular" },
        { key: "new-releases", selector: "#new-releases" },
        { key: "genre-rail", selector: ".genre-rail" },
        { key: "genre-recommendations", selector: ".genre-recommendations" },
        { key: "spotlight", selector: ".spotlight" },
        { key: "finder", selector: "#search" },
        { key: "categories", selector: "#categories" },
        { key: "library", selector: "#library" },
        { key: "creator", selector: "#creator" },
        { key: "creators", selector: "#creators" },
        { key: "cta", selector: ".cta" }
      ];
      const originals = {};
      definitions.forEach(function (definition) {
        const element = document.querySelector(definition.selector);
        if (element) originals[definition.key] = element;
      });
      const ordered = [];
      const orderedIds = new Set();
      sections.forEach(function (item) {
        if (!item || typeof item !== "object") return;
        const itemId = typeof item.id === "string" ? item.id : "";
        if (itemId && orderedIds.has(itemId)) return;
        if (itemId) orderedIds.add(itemId);
        if (item.type === "custom-page") {
          const page = (Array.isArray(data.publishedPages) ? data.publishedPages : [])
            .find(function (candidate) { return candidate.id === item.pageId; });
          if (!page || !page.url || !page.name) return;
          const customSection = document.createElement("section");
          customSection.className = "section vm-published-page";
          customSection.dataset.vmSectionId = item.id;
          customSection.dataset.vmSectionType = "custom-page";
          const customPageHidden = item.hidden === true;
          customSection.hidden = customPageHidden;
          customSection.style.cssText = "padding:24px 5%;";
          if (customPageHidden) customSection.style.setProperty("display", "none", "important");
          customSection.setAttribute("aria-hidden", String(customPageHidden));
          const link = document.createElement("a");
          link.href = page.url;
          link.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:22px 24px;border:1px solid var(--line,#333);border-radius:12px;color:inherit;text-decoration:none;background:rgba(255,255,255,.025);";
          const previewImage = item.content && typeof item.content.image === "string" && item.content.image ? item.content.image : page.image;
          const safePreviewImage = previewImage && (previewImage.startsWith("https://") || previewImage.startsWith("http://") || (previewImage.startsWith("/") && !previewImage.startsWith("//")) || previewImage.startsWith("data:image/webp;base64,"));
          if (safePreviewImage) {
            const image = document.createElement("img");
            image.src = previewImage;
            image.alt = "";
            image.loading = "lazy";
            image.style.cssText = "width:clamp(90px,18vw,180px);height:clamp(64px,10vw,110px);object-fit:cover;border-radius:8px;flex:0 0 auto;";
            link.appendChild(image);
          }
          const copy = document.createElement("span");
          copy.style.cssText = "display:grid;gap:8px;min-width:0;flex:1;";
          const heading = document.createElement("strong");
          heading.textContent = item.content && item.content.title || page.name;
          const action = document.createElement("span");
          action.textContent = item.content && item.content.button || "ページを見る →";
          copy.append(heading, action);
          link.appendChild(copy);
          customSection.appendChild(link);
          ordered.push(customSection);
          return;
        }
        if (["custom-text", "custom-image", "custom-image-text", "custom-gallery", "custom-cards", "custom-button", "custom-divider", "custom-spacer"].includes(item.type)) {
          const customSection = document.createElement("section");
          customSection.className = "section vm-homepage-custom-block vm-homepage-" + item.type;
          customSection.dataset.vmSectionId = item.id || item.type;
          customSection.dataset.vmSectionType = item.type;
          const customContent = item.content && typeof item.content === "object" ? item.content : {};
          const layout = customContent.layout || "standard";
          customSection.style.cssText = "box-sizing:border-box;width:100%;padding:32px 5%;";
          if (layout === "wide") customSection.style.paddingInline = "2%";
          if (layout === "narrow") { customSection.style.maxWidth = "900px"; customSection.style.marginInline = "auto"; }
          if (layout === "center") customSection.style.textAlign = "center";
          if (item.hidden === true) {
            customSection.hidden = true;
            customSection.style.setProperty("display", "none", "important");
            customSection.setAttribute("aria-hidden", "true");
          }
          function addText(tag, value, className) {
            if (typeof value !== "string" || !value.trim()) return null;
            const element = document.createElement(tag);
            element.textContent = value.trim();
            if (className) element.className = className;
            customSection.appendChild(element);
            return element;
          }
          if (item.type !== "custom-divider" && item.type !== "custom-spacer") {
            addText("h2", customContent.title, "section-headline");
            addText("p", customContent.subtitle, "section-description");
          }
          if (item.type === "custom-text" || item.type === "custom-image-text") {
            const body = typeof customContent.body === "string" ? customContent.body.trim() : "";
            if (body) {
              const paragraph = document.createElement("div");
              paragraph.className = "vm-homepage-custom-body";
              paragraph.style.cssText = "white-space:pre-line;line-height:1.8;max-width:100%;overflow-wrap:anywhere;";
              paragraph.textContent = body;
              customSection.appendChild(paragraph);
            }
          }
          const imageUrl = typeof customContent.image === "string" ? customContent.image.trim() : "";
          if ((item.type === "custom-image" || item.type === "custom-image-text") && imageUrl &&
              (imageUrl.startsWith("https://") || imageUrl.startsWith("http://") || (imageUrl.startsWith("/") && !imageUrl.startsWith("//")))) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = customContent.title || "";
            image.loading = "lazy";
            image.style.cssText = "display:block;max-width:100%;max-height:520px;object-fit:cover;border-radius:12px;margin:16px auto;";
            customSection.appendChild(image);
          }
          if (item.type === "custom-gallery" || item.type === "custom-cards") {
            const grid = document.createElement("div");
            const columnCount = [2, 3, 4, 5].includes(Number(customContent.columns)) ? Number(customContent.columns) : 3;
            grid.className = "vm-homepage-custom-grid";
            grid.style.cssText = "display:grid;grid-template-columns:repeat(var(--vm-homepage-card-columns,3),minmax(0,1fr));gap:16px;margin-top:18px;";
            grid.style.setProperty("--vm-homepage-card-columns", String(columnCount));
            (Array.isArray(customContent.items) ? customContent.items : []).forEach(function (entry) {
              if (!entry || typeof entry !== "object") return;
              const card = document.createElement(entry.link && (entry.link.startsWith("/") && !entry.link.startsWith("//") || entry.link.startsWith("https://") || entry.link.startsWith("http://")) ? "a" : "article");
              if (card.tagName === "A") {
                const target = String(entry.link);
                if (target.startsWith("/") && !target.startsWith("//")) card.href = target;
                else {
                  try { const url = new URL(target); if (url.protocol === "https:" || url.protocol === "http:") card.href = url.href; } catch (_) {}
                }
              }
              card.style.cssText = "display:grid;align-content:start;gap:8px;min-width:0;padding:14px;border:1px solid var(--line,#333);border-radius:12px;color:inherit;text-decoration:none;background:rgba(255,255,255,.025);";
              if (entry.image && (entry.image.startsWith("https://") || entry.image.startsWith("http://") || (entry.image.startsWith("/") && !entry.image.startsWith("//")))) {
                const image = document.createElement("img");
                image.src = entry.image;
                image.alt = "";
                image.loading = "lazy";
                image.style.cssText = "width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;";
                card.appendChild(image);
              }
              if (entry.title) { const heading = document.createElement("strong"); heading.textContent = entry.title; card.appendChild(heading); }
              if (entry.description) { const description = document.createElement("p"); description.textContent = entry.description; card.appendChild(description); }
              grid.appendChild(card);
            });
            customSection.appendChild(grid);
          }
          if (item.type === "custom-button" && customContent.button) {
            const button = document.createElement("a");
            button.textContent = customContent.button;
            button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:12px 20px;border-radius:999px;background:var(--accent,#d9b45f);color:#111;text-decoration:none;font-weight:700;";
            const link = String(customContent.link || "");
            if (link.startsWith("/") && !link.startsWith("//")) button.href = link;
            else { try { const url = new URL(link); if (url.protocol === "https:" || url.protocol === "http:") button.href = url.href; } catch (_) {} }
            customSection.appendChild(button);
          }
          if (item.type === "custom-divider") {
            const divider = document.createElement("hr");
            divider.style.cssText = "border:0;border-top:1px solid var(--line,#333);margin:0 auto;width:100%;";
            customSection.appendChild(divider);
          }
          if (item.type === "custom-spacer") {
            const spacer = document.createElement("div");
            spacer.setAttribute("aria-hidden", "true");
            spacer.style.height = "48px";
            customSection.appendChild(spacer);
          }
          ordered.push(customSection);
          return;
        }
        let section = originals[item.id] || null;
        if (!section) {
          const source = originals[item.type];
          if (!source) return;
          section = source.cloneNode(true);
          section.removeAttribute("id");
          section.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
          const heading = section.querySelector(".section-head h2, h2");
          if (heading && item.label) heading.textContent = item.label;
          originals[item.id] = section;
        }
        const sectionHidden = item.hidden === true;
        section.hidden = sectionHidden;
        if (sectionHidden) section.style.setProperty("display", "none", "important");
        else section.style.removeProperty("display");
        section.setAttribute("aria-hidden", String(sectionHidden));
        const sectionContent = item.content && typeof item.content === "object" ? item.content : {};
        if (typeof sectionContent.title === "string" && sectionContent.title.trim()) {
          const heading = section.querySelector(".section-head h2, .hero-copy h1, .spotlight-copy h2, .finder h2, .library-copy h2, .creator-copy h2, .cta h2, h1, h2");
          if (heading) {
            heading.textContent = sectionContent.title.trim();
            heading.style.whiteSpace = "pre-line";
          }
        }
        if (typeof sectionContent.subtitle === "string" && sectionContent.subtitle.trim()) {
          const description = section.querySelector(".section-head p, .hero-copy > p, .video-showcase-copy, .collection-copy, .spotlight-copy > p, .finder > div > p, .library-copy > p, .creator-copy > p, .cta > p");
          if (description) description.textContent = sectionContent.subtitle.trim();
        }
        if (typeof sectionContent.button === "string" && sectionContent.button.trim()) {
          const button = section.querySelector(".actions a.primary, .section-head > a, .spotlight-copy > a, .find-row a, .library-copy > a, .creator-copy > a, .cta a.primary");
          if (button) button.textContent = sectionContent.button.trim();
        }
        if (typeof sectionContent.link === "string" && sectionContent.link.trim()) {
          const button = section.querySelector(".actions a.primary, .section-head > a, .spotlight-copy > a, .find-row a, .library-copy > a, .creator-copy > a, .cta a.primary");
          if (button) {
            try {
              const target = new URL(sectionContent.link.trim(), window.location.origin);
              if (target.origin === window.location.origin) button.href = target.pathname + target.search + target.hash;
            } catch (_) {}
          }
        }
        if (typeof sectionContent.image === "string" && sectionContent.image.trim() && item.type === "hero") {
          const background = section.querySelector(".hero-bg");
          if (background) {
            try {
              const target = new URL(sectionContent.image.trim(), window.location.origin);
              if (target.origin === window.location.origin || ["https:", "http:"].includes(target.protocol)) {
                background.style.backgroundImage = 'url("' + target.href.replace(/["\\\\]/g, "") + '")';
              }
            } catch (_) {}
          }
        }
        const theme = data.themes && data.themes[item.id];
        if (theme && typeof theme === "object") {
          if (typeof theme.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.bg)) section.style.backgroundColor = theme.bg;
          if (typeof theme.text === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.text)) section.style.color = theme.text;
          if (typeof theme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.accent)) section.style.setProperty("--section-accent", theme.accent);
          if (typeof theme.radius === "string") section.style.borderRadius = theme.radius === "square" ? "0" : "16px";
          if (typeof theme.spacing === "string") section.style.paddingBlock = theme.spacing === "compact" ? "18px" : theme.spacing === "large" ? "64px" : "36px";
          if (typeof theme.width === "string") {
            section.style.maxWidth = theme.width === "narrow" ? "900px" : theme.width === "wide" ? "none" : "";
            if (theme.width === "narrow") section.style.marginInline = "auto";
          }
        }
        ordered.push(section);
      });
      // Keep standard homepage sections available when older saved settings omit an entry.
      // An explicit saved item (including hidden:true) remains authoritative.
      const configuredTypes = new Set(sections
        .filter(function (item) { return item && typeof item === "object"; })
        .map(function (item) { return item.type || item.key || item.id; }));
      definitions.forEach(function (definition, definitionIndex) {
        if (configuredTypes.has(definition.key)) return;
        const missingSection = originals[definition.key];
        if (!missingSection || ordered.includes(missingSection)) return;
        missingSection.hidden = false;
        missingSection.style.removeProperty("display");
        missingSection.setAttribute("aria-hidden", "false");
        // Restore omitted standard sections near their default position without
        // changing the relative order of sections that were explicitly saved.
        const nextDefinition = definitions.slice(definitionIndex + 1).find(function (candidate) {
          const nextSection = originals[candidate.key];
          return nextSection && ordered.includes(nextSection);
        });
        const nextSection = nextDefinition && originals[nextDefinition.key];
        if (nextSection) ordered.splice(ordered.indexOf(nextSection), 0, missingSection);
        else ordered.push(missingSection);
      });
      ordered.forEach(function (section) { main.appendChild(section); });
      main.querySelectorAll(".vm-published-pages").forEach(function (section) { section.remove(); });
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyBranding(document.getElementById("settings-form") ? readSettings() : {});
    installSettingsForm();
    installGlobalChromeForm();
    installTopSettingsEditor();
    installSessionNavigation();
    syncHomepageSections();
    syncPublicSettings();
  });
})();