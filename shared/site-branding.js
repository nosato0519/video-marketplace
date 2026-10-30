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
    const standardSectionTypes = new Set(definitions.map(function (item) { return item.type; }));
    const customTypes = new Set(customDefinitions.map(function (item) { return item.type; }));
    let nextAddedSectionId = 0;
    let sections = [];
    let publishedPages = [];
    function normalize(items, publishedPages) {
      const source = Array.isArray(items) ? items : [];
      const seenIds = new Set();
      const seenTypes = new Set();
      const seenPublishedPageIds = new Set();
      const normalized = source.filter(function (item) {
        if (!item || typeof item !== "object") return false;
        const id = typeof item.id === "string" && item.id ? item.id : item.type;
        if (typeof id !== "string" || !id || seenIds.has(id)) return false;
        if (item.type === "custom-page") {
          if (typeof item.pageId !== "string" || !item.pageId || seenPublishedPageIds.has(item.pageId)) return false;
          if (!publishedPages.some(function (page) { return page.id === item.pageId; })) return false;
          seenIds.add(id);
          seenPublishedPageIds.add(item.pageId);
          return true;
        }
        if (!allDefinitions.some(function (def) { return def.type === item.type; })) return false;
        seenIds.add(id);
        if (!customTypes.has(item.type) && seenTypes.has(item.type)) return false;
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

      normalized.forEach(function (item) {
        if (item.type !== "custom-page") return;
        const page = publishedPages.find(function (candidate) { return candidate.id === item.pageId; });
        if (!page || !Array.isArray(page.topSections)) return;
        item.content.topSections = JSON.parse(JSON.stringify(page.topSections));
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
          content: Object.assign({ title: page.name, link: page.url }, Array.isArray(page.topSections) ? { topSections: JSON.parse(JSON.stringify(page.topSections)) } : {})
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
        if (["themeBg", "themeText", "themeAccent", "themeButtonText"].includes(key)) {
          const themeKey = { themeBg: "bg", themeText: "text", themeAccent: "accent", themeButtonText: "buttonText" }[key];
          item.content.theme = item.content.theme && typeof item.content.theme === "object" ? item.content.theme : {};
          if (input.value.trim()) item.content.theme[themeKey] = input.value.trim();
          else delete item.content.theme[themeKey];
        } else {
          item.content[key] = input.value;
        }
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
    function renderItemsEditor(item) {
      const wrapper = document.createElement("div");
      wrapper.style.cssText = "grid-column:1/-1;display:grid;gap:10px;";
      const heading = document.createElement("strong");
      heading.textContent = "項目の内容";
      wrapper.appendChild(heading);
      if (!Array.isArray(item.content.items)) {
        item.content.items = typeof item.content.itemsText === "string"
          ? item.content.itemsText.split(/\r?\n/).map(function (line) {
              const parts = line.split("|").map(function (part) { return part.trim(); });
              return { title: parts[0] || "", description: parts[1] || "", image: parts[2] || "", link: parts[3] || "" };
            }).filter(function (entry) { return entry.title || entry.description || entry.image || entry.link; })
          : [];
      }
      const bulkLabel = document.createElement("label");
      bulkLabel.style.cssText = "display:grid;gap:6px;font-size:12px;";
      bulkLabel.appendChild(document.createTextNode("項目（1行ごとに「タイトル|説明|画像URL|リンク先」）"));
      const bulkInput = document.createElement("textarea");
      bulkInput.rows = 3;
      bulkInput.value = item.content.items.map(function (entry) {
        return [entry.title || "", entry.description || "", /^data:image\//i.test(entry.image || "") ? "" : (entry.image || ""), entry.link || ""].join("|");
      }).join("\n");
      bulkInput.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
      bulkInput.addEventListener("input", function () {
        const previousItems = item.content.items.slice();
        item.content.items = bulkInput.value.split(/\r?\n/).map(function (line, index) {
          const parts = line.split("|").map(function (part) { return part.trim(); });
          const previous = previousItems[index] && typeof previousItems[index] === "object" ? previousItems[index] : {};
          const image = parts[2] || (/^data:image\//i.test(previous.image || "") ? previous.image : "");
          const entry = { title: parts[0] || "", description: parts[1] || "", image: image, link: parts[3] || "" };
          if (previous.button) entry.button = previous.button;
          return entry;
        }).filter(function (entry) { return entry.title || entry.description || entry.image || entry.button || entry.link; });
        renderRows();
      });
      bulkLabel.appendChild(bulkInput);
      const bulkHint = document.createElement("small");
      bulkHint.textContent = "複数項目をまとめて入力できます。下の項目編集欄から個別に編集することもできます。";
      bulkLabel.appendChild(bulkHint);
      const list = document.createElement("div");
      list.style.cssText = "display:grid;gap:10px;";
      function syncBulkInput() {
        bulkInput.value = item.content.items.map(function (entry) {
          return [entry.title || "", entry.description || "", /^data:image\//i.test(entry.image || "") ? "" : (entry.image || ""), entry.link || ""].join("|");
        }).join("\n");
      }
      function renderRows() {
        list.replaceChildren();
        item.content.items.forEach(function (entry, index) {
          if (!entry || typeof entry !== "object") {
            item.content.items[index] = {};
            entry = item.content.items[index];
          }
          const card = document.createElement("div");
          card.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;padding:10px;border:1px solid var(--line,#333);border-radius:8px;";
          const title = document.createElement("strong");
          title.textContent = "項目 " + (index + 1);
          title.style.cssText = "grid-column:1/-1;";
          card.appendChild(title);
          [["title","タイトル"],["description","説明文"],["image","画像URL（または画像アップロード）"],["button","ボタン表示"],["link","リンク先"]].forEach(function (fieldData) {
            const label = document.createElement("label");
            label.style.cssText = "display:grid;gap:4px;min-width:0;font-size:12px;";
            label.appendChild(document.createTextNode(fieldData[1]));
            const input = document.createElement("input");
            input.type = "text";
            input.value = fieldData[0] === "image" && /^data:image\//i.test(entry.image || "") ? "" : (entry[fieldData[0]] || "");
            input.placeholder = fieldData[0] === "link" ? "/pages/video-list.html または https://…" : "";
            input.style.cssText = "box-sizing:border-box;width:100%;min-width:0;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
            input.addEventListener("input", function () { entry[fieldData[0]] = input.value.trim(); syncBulkInput(); });
            label.appendChild(input);
            if (fieldData[0] === "image") {
              const upload = document.createElement("input");
              upload.type = "file";
              upload.accept = "image/*";
              upload.setAttribute("aria-label", "項目 " + (index + 1) + " の画像をアップロード");
              upload.style.cssText = "display:block;max-width:100%;margin-top:4px;";
              const hint = document.createElement("small");
              hint.textContent = /^data:image\//i.test(entry.image || "") ? "アップロード画像を設定済み" : "画像ファイルから設定できます";
              label.append(upload, hint);
              upload.addEventListener("change", function () {
                const file = upload.files && upload.files[0];
                if (!file) return;
                if (!file.type || !file.type.startsWith("image/")) {
                  status.textContent = "画像ファイルを選択してください。";
                  upload.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onerror = function () { status.textContent = "画像を読み込めませんでした。"; upload.value = ""; };
                reader.onload = function () {
                  const image = new Image();
                  image.onerror = function () { status.textContent = "画像を開けませんでした。"; upload.value = ""; };
                  image.onload = function () {
                    const scale = Math.min(1, 1200 / image.width, 900 / image.height);
                    const canvas = document.createElement("canvas");
                    canvas.width = Math.max(1, Math.round(image.width * scale));
                    canvas.height = Math.max(1, Math.round(image.height * scale));
                    const context = canvas.getContext("2d");
                    if (!context) { status.textContent = "画像を処理できませんでした。"; upload.value = ""; return; }
                    context.drawImage(image, 0, 0, canvas.width, canvas.height);
                    let quality = 0.78;
                    let dataUrl = canvas.toDataURL("image/webp", quality);
                    while (dataUrl.length > 120000 && quality > 0.42) {
                      quality = Math.max(0.42, quality - 0.08);
                      dataUrl = canvas.toDataURL("image/webp", quality);
                    }
                    if (dataUrl.length > 120000) {
                      status.textContent = "画像サイズが大きすぎます。小さい画像を選択してください。";
                      upload.value = "";
                      return;
                    }
                    entry.image = dataUrl;
                    hint.textContent = "アップロード画像を設定済み";
                    status.textContent = "項目 " + (index + 1) + " の画像を設定しました。保存すると反映されます。";
                    upload.value = "";
                  };
                  image.src = String(reader.result || "");
                };
                reader.readAsDataURL(file);
              });
            }
            card.appendChild(label);
          });
          const remove = document.createElement("button");
          remove.type = "button";
          remove.className = "btn";
          remove.textContent = "この項目を削除";
          remove.style.gridColumn = "1/-1";
          remove.addEventListener("click", function () {
            item.content.items.splice(index, 1);
            renderRows();
            syncBulkInput();
          });
          card.appendChild(remove);
          list.appendChild(card);
        });
      }
      const addItem = document.createElement("button");
      addItem.type = "button";
      addItem.className = "btn";
      addItem.textContent = "項目を追加";
      addItem.addEventListener("click", function () {
        item.content.items.push({ title: "", description: "", image: "", button: "", link: "" });
        renderRows();
        syncBulkInput();
      });
      renderRows();
      wrapper.append(bulkLabel, list, addItem);
      return wrapper;
    }
    function renderPublishedPageSectionsEditor(item) {
      const details = document.createElement("details");
      details.open = true;
      details.style.cssText = "grid-column:1/-1;border-top:1px solid var(--line,#333);padding-top:10px;";
      const summary = document.createElement("summary");
      summary.textContent = "TOP掲載用の自由構成";
      summary.style.cursor = "pointer";
      details.appendChild(summary);
      const help = document.createElement("p");
      help.textContent = "このページの本文とは別に、TOPに表示するブロックを自由に組み立てます。追加・編集・順番変更した内容がTOPに表示されます。";
      help.style.cssText = "margin:8px 0;font-size:12px;line-height:1.6;opacity:.75;";
      details.appendChild(help);
      const blockTypes = [
        ["custom-text","見出し・文章"],
        ["popular","人気の動画"],
        ["categories","カテゴリー一覧"],
        ["custom-image-text","画像＋文章"],
        ["custom-gallery","画像ギャラリー"]
      ];
      if (!Array.isArray(item.content.topSections)) {
        const page = publishedPages.find(function (entry) { return entry && entry.id === item.pageId; });
        const hasSavedTopSections = Boolean(page && Array.isArray(page.topSections));
        const legacySections = hasSavedTopSections ? page.topSections : (page && Array.isArray(page.sections) ? page.sections : []);
        const selectedIds = Array.isArray(item.content.visibleSectionIds) ? new Set(item.content.visibleSectionIds.map(String)) : null;
        item.content.topSections = legacySections
          .filter(function (section) {
            if (!section || typeof section !== "object" || section.hidden === true) return false;
            if (hasSavedTopSections) return true;
            return selectedIds ? selectedIds.has(String(section.id)) : !standardSectionTypes.has(section.type);
          })
          .map(function (section) { return JSON.parse(JSON.stringify(section)); });
      }
      const supportedTopBlockTypes = new Set(blockTypes.map(function (entry) { return entry[0]; }));
      item.content.topSections = item.content.topSections.filter(function (section) {
        return section && typeof section === "object" && supportedTopBlockTypes.has(section.type);
      });
      const list = document.createElement("div");
      list.style.cssText = "display:grid;gap:10px;";
      function renderBlocks() {
        list.replaceChildren();
        item.content.topSections.forEach(function (block, index) {
          if (!block || typeof block !== "object") return;
          block.content = block.content && typeof block.content === "object" ? block.content : {};
          block.theme = block.theme && typeof block.theme === "object" ? block.theme : {};
          block.settings = block.settings && typeof block.settings === "object" ? block.settings : {};
          const card = document.createElement("section");
          card.style.cssText = "display:grid;gap:8px;padding:12px;border:1px solid var(--line,#333);border-radius:8px;";
          const head = document.createElement("div");
          head.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;";
          const name = document.createElement("strong");
          name.textContent = (blockTypes.find(function (entry) { return entry[0] === block.type; }) || ["","自由ブロック"])[1];
          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:6px;";
          function action(label, disabled, callback) {
            const button = document.createElement("button");
            button.type = "button"; button.className = "btn"; button.textContent = label; button.disabled = disabled;
            button.addEventListener("click", callback); actions.appendChild(button);
          }
          action("↑", index === 0, function () { const rows=item.content.topSections; [rows[index-1],rows[index]]=[rows[index],rows[index-1]]; renderBlocks(); });
          action("↓", index === item.content.topSections.length-1, function () { const rows=item.content.topSections; [rows[index+1],rows[index]]=[rows[index],rows[index+1]]; renderBlocks(); });
          action("削除", false, function () { item.content.topSections.splice(index,1); renderBlocks(); });
          head.append(name, actions); card.appendChild(head);
          function addImageUpload(label, input, getValue, setValue) {
            const upload = document.createElement("input");
            upload.type = "file";
            upload.accept = "image/*";
            upload.setAttribute("aria-label", "PCから画像を選択");
            upload.style.cssText = "display:block;max-width:100%;margin-top:6px;";
            const preview = document.createElement("img");
            preview.alt = "選択した画像のプレビュー";
            preview.style.cssText = "display:block;max-width:220px;max-height:140px;object-fit:contain;margin-top:6px;border-radius:6px;";
            preview.hidden = !getValue();
            if (getValue()) preview.src = getValue();
            if ((getValue() || "").indexOf("data:image/") === 0) input.placeholder = "PCから選択した画像を設定済み";
            upload.addEventListener("change", async function () {
              const file = upload.files && upload.files[0];
              if (!file) return;
              upload.disabled = true;
              try {
                if (typeof window.compressPageImage !== "function") throw new Error("画像選択機能を読み込めませんでした。ページを再読み込みしてください。");
                const dataUrl = await window.compressPageImage(file);
                setValue(dataUrl);
                input.value = "";
                input.placeholder = "PCから選択した画像を設定済み";
                preview.src = dataUrl;
                preview.hidden = false;
              } catch (error) {
                window.alert(error && error.message ? error.message : "画像を読み込めませんでした。");
              } finally {
                upload.disabled = false;
                upload.value = "";
              }
            });
            input.addEventListener("input", function () {
              const value = getValue();
              preview.src = value || "";
              preview.hidden = !value;
            });
            label.appendChild(upload);
            label.appendChild(preview);
          }
          function addField(labelText, key, multiline) {
            const label = document.createElement("label");
            label.style.cssText = "display:grid;gap:5px;font-size:12px;";
            label.appendChild(document.createTextNode(key === "image" ? "画像（PCから選択／URL入力も可）" : labelText));
            const control = document.createElement(multiline ? "textarea" : "input");
            if (!multiline) control.type = "text";
            else control.rows = key === "body" ? 4 : 2;
            control.value = typeof block.content[key] === "string" && String(block.content[key]).indexOf("data:image/") !== 0 ? block.content[key] : "";
            if (key === "image") control.placeholder = "画像URL（任意）";
            control.addEventListener("input", function () { block.content[key] = control.value; });
            label.appendChild(control);
            if (key === "image") addImageUpload(label, control, function () { return block.content.image || ""; }, function (value) { block.content.image = value; });
            card.appendChild(label);
          }
          if (block.type === "custom-spacer") {
            const heightLabel = document.createElement("label");
            heightLabel.style.cssText = "display:grid;gap:5px;font-size:12px;";
            heightLabel.appendChild(document.createTextNode("余白の高さ"));
            const heightSelect = document.createElement("select");
            [[32,"小"],[64,"標準"],[96,"広め"],[128,"大きめ"],[160,"大"],[240,"最大"]].forEach(function (entry) {
              const option = document.createElement("option");
              option.value = String(entry[0]);
              option.textContent = entry[1] + "（" + entry[0] + "px）";
              heightSelect.appendChild(option);
            });
            heightSelect.value = String(Math.max(16, Math.min(240, Number(block.settings.height) || 64)));
            heightSelect.addEventListener("change", function () { block.settings.height = Number(heightSelect.value); });
            heightLabel.appendChild(heightSelect);
            card.appendChild(heightLabel);
          }
          if (!["custom-divider","custom-spacer"].includes(block.type)) {
            addField("見出し","title",false);
            addField("説明文","subtitle",true);
          }
          if (["custom-text","custom-image-text"].includes(block.type)) addField("本文","body",true);
          if (["custom-image","custom-image-text"].includes(block.type)) addField("画像URL","image",false);
          if (["custom-button","custom-image-text"].includes(block.type)) {
            addField("ボタン表示名","button",false); addField("リンク先","link",false);
          }
          if (block.type === "popular" || block.type === "categories") {
            const settings = block.settings;
            const settingDefinitions = block.type === "popular"
              ? [
                  { key: "videoCount", label: "表示する動画数", value: settings.videoCount || 8, options: [["4","4件"],["8","8件"],["12","12件"],["16","16件"],["24","24件"]] },
                  { key: "columns", label: "1行のカード数", value: settings.columns || 4, options: [["2","2列"],["3","3列"],["4","4列"],["5","5列"]] }
                ]
              : [
                  { key: "categoryCount", label: "表示するカテゴリー数", value: settings.categoryCount || 12, options: [["4","4件"],["6","6件"],["8","8件"],["12","12件"],["16","16件"],["20","20件"]] },
                  { key: "columns", label: "1行の表示数", value: settings.columns || 3, options: [["2","2列"],["3","3列"],["4","4列"]] }
                ];
            const settingsGrid = document.createElement("div");
            settingsGrid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;";
            settingDefinitions.forEach(function (definition) {
              const label = document.createElement("label");
              label.style.cssText = "display:grid;gap:5px;font-size:12px;";
              label.appendChild(document.createTextNode(definition.label));
              const select = document.createElement("select");
              definition.options.forEach(function (optionData) {
                const option = document.createElement("option");
                option.value = optionData[0];
                option.textContent = optionData[1];
                select.appendChild(option);
              });
              select.value = String(definition.value);
              select.addEventListener("change", function () {
                settings[definition.key] = Number(select.value);
              });
              label.appendChild(select);
              settingsGrid.appendChild(label);
            });
            card.appendChild(settingsGrid);
          }
          if (["custom-gallery","custom-cards"].includes(block.type)) {
            const columns = document.createElement("label");
            columns.style.cssText = "display:grid;gap:5px;font-size:12px;";
            columns.appendChild(document.createTextNode("1行の表示数"));
            const select = document.createElement("select");
            [["2","2列"],["3","3列"],["4","4列"],["5","5列"]].forEach(function (entry) {
              const option=document.createElement("option"); option.value=entry[0]; option.textContent=entry[1]; select.appendChild(option);
            });
            select.value=String(block.content.columns || 3);
            select.addEventListener("change",function(){block.content.columns=Number(select.value);});
            columns.appendChild(select); card.appendChild(columns);
            if (!Array.isArray(block.content.items)) block.content.items=[];
            const items=document.createElement("div"); items.style.cssText="display:grid;gap:8px;";
            function renderItems(){
              items.replaceChildren();
              block.content.items.forEach(function(entry,itemIndex){
                const itemFields=document.createElement("div"); itemFields.style.cssText="display:grid;gap:5px;padding:8px;border:1px solid var(--line,#333);border-radius:6px;";
                if (block.type === "custom-gallery") {
                  const imageLabel=document.createElement("label"); imageLabel.style.cssText="display:grid;gap:3px;font-size:11px;"; imageLabel.textContent="画像（PCから選択／URL入力も可）";
                  const imageInput=document.createElement("input"); imageInput.type="text"; imageInput.value=/^data:image\//i.test(entry.image||"")?"":(entry.image||"");
                  imageInput.placeholder=/^data:image\//i.test(entry.image||"")?"PCから選択した画像を設定済み":"画像URL（任意）";
                  imageInput.addEventListener("input",function(){entry.image=imageInput.value;});
                  imageLabel.appendChild(imageInput);
                  addImageUpload(imageLabel,imageInput,function(){return entry.image||"";},function(value){entry.image=value;});
                  itemFields.appendChild(imageLabel);
                  const linkLabel=document.createElement("label"); linkLabel.style.cssText="display:grid;gap:3px;font-size:11px;"; linkLabel.textContent="リンク先（任意）";
                  const linkInput=document.createElement("input"); linkInput.type="text"; linkInput.placeholder="/pages/video-list.html"; linkInput.value=entry.link||"";
                  linkInput.addEventListener("input",function(){entry.link=linkInput.value;});
                  linkLabel.appendChild(linkInput); itemFields.appendChild(linkLabel);
                } else {
                  [["タイトル","title"],["説明","description"],["画像URL","image"],["ボタン","button"],["リンク先","link"]].forEach(function(fieldDef){
                    const label=document.createElement("label"); label.style.cssText="display:grid;gap:3px;font-size:11px;"; label.textContent=fieldDef[1] === "image" ? "画像（PCから選択／URL入力も可）" : fieldDef[0];
                    const input=document.createElement("input"); input.type="text"; input.value=fieldDef[1] === "image" && String(entry.image||"").indexOf("data:image/") === 0 ? "" : (entry[fieldDef[1]]||"");
                    if (fieldDef[1] === "image") input.placeholder = String(entry.image||"").indexOf("data:image/") === 0 ? "PCから選択した画像を設定済み" : "画像URL（任意）";
                    input.addEventListener("input",function(){entry[fieldDef[1]]=input.value;}); label.appendChild(input);
                    if (fieldDef[1] === "image") addImageUpload(label, input, function () { return entry.image || ""; }, function (value) { entry.image = value; });
                    itemFields.appendChild(label);
                  });
                }
                const remove=document.createElement("button"); remove.type="button"; remove.className="btn"; remove.textContent="項目を削除";
                remove.addEventListener("click",function(){block.content.items.splice(itemIndex,1);renderItems();});
                itemFields.appendChild(remove); items.appendChild(itemFields);
              });
            }
            const addItem=document.createElement("button"); addItem.type="button"; addItem.className="btn"; addItem.textContent=block.type === "custom-gallery" ? "画像を追加" : "カード・画像を追加";
            addItem.addEventListener("click",function(){block.content.items.push(block.type === "custom-gallery" ? {image:"",link:""} : {title:"",description:"",image:"",button:"",link:""});renderItems();});
            renderItems(); card.append(items,addItem);
          }
          const design=document.createElement("details");
          const designSummary=document.createElement("summary"); designSummary.textContent="このブロックのデザイン"; design.appendChild(designSummary);
          const designGrid=document.createElement("div"); designGrid.style.cssText="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:8px;";
          function addDesignSelect(labelText, key, options) {
            const label = document.createElement("label");
            label.style.cssText = "display:grid;gap:4px;font-size:11px;";
            label.appendChild(document.createTextNode(labelText));
            const select = document.createElement("select");
            options.forEach(function (entry) {
              const option = document.createElement("option");
              option.value = entry[0];
              option.textContent = entry[1];
              select.appendChild(option);
            });
            select.value = block.theme[key] || "";
            select.addEventListener("change", function () {
              if (select.value) block.theme[key] = select.value;
              else delete block.theme[key];
            });
            label.appendChild(select);
            designGrid.appendChild(label);
          }
          addDesignSelect("横幅", "width", [["","標準"],["narrow","狭い"],["standard","標準幅"],["wide","広い"]]);
          addDesignSelect("上下の余白", "spacing", [["","標準"],["compact","狭い"],["standard","標準"],["large","広い"]]);
          addDesignSelect("角の形", "radius", [["","角丸"],["square","四角"]]);
          if (["custom-image","custom-image-text","custom-gallery","custom-cards"].includes(block.type)) {
            addDesignSelect("画像の表示方法", "imageFit", [["","標準（枠いっぱい）"],["contain","画像全体を表示"]]);
          }
          [["背景色","bg"],["文字色","text"],["アクセント色","accent"]].forEach(function(entry){
            const label=document.createElement("label"); label.style.cssText="display:grid;gap:4px;font-size:11px;"; label.textContent=entry[0];
            const input=document.createElement("input"); input.type="text"; input.placeholder="#000000"; input.value=block.theme[entry[1]]||"";
            input.addEventListener("input",function(){block.theme[entry[1]]=input.value;}); label.appendChild(input); designGrid.appendChild(label);
          });
          design.appendChild(designGrid); card.appendChild(design);
          list.appendChild(card);
        });
      }
      const addRow=document.createElement("div");
      addRow.style.cssText="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:10px 0;";
      const typeSelect=document.createElement("select");
      blockTypes.forEach(function(entry){const option=document.createElement("option");option.value=entry[0];option.textContent=entry[1];typeSelect.appendChild(option);});
      const addButton=document.createElement("button"); addButton.type="button"; addButton.className="btn primary"; addButton.textContent="ブロックを追加";
      addButton.addEventListener("click",function(){
        const type=typeSelect.value;
        item.content.topSections.push({id:"top-block-"+Date.now()+"-"+(++nextAddedSectionId),type:type,label:(blockTypes.find(function(entry){return entry[0]===type;})||[])[1],hidden:false,content:{},theme:{},settings:{}});
        renderBlocks();
      });
      addRow.append(typeSelect,addButton);
      renderBlocks();
      details.append(addRow,list);
      return details;
    }

    window.VMPageTopSectionsEditor = function (item) { return renderPublishedPageSectionsEditor(item); };

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
        if (customTypes.has(item.type)) {
          button("複製", false, function () {
            let id;
            do {
              id = item.type + "-copy-" + Date.now() + "-" + (++nextAddedSectionId);
            } while (sections.some(function (section) { return section && section.id === id; }));
            const copy = JSON.parse(JSON.stringify(item));
            copy.id = id;
            copy.label = (item.label || item.type) + "（複製）";
            copy.added = true;
            copy.order = index + 1;
            sections.splice(index + 1, 0, copy);
            render();
          });
        }
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
        if (item.type !== "custom-page") {
          fields.append(
            field("見出し", "title", item.content.title, item, false),
            field("説明", "subtitle", item.content.subtitle, item, true),
            field("ボタン表示", "button", item.content.button, item, false),
            field("リンク先", "link", item.content.link, item, false),
            field("画像URL", "image", item.content.image, item, false)
          );
        }
        if (item.type === "custom-text" || item.type === "custom-image-text") {
          fields.appendChild(field("本文", "body", item.content.body, item, true));
        }
        if (item.type === "custom-page") {
          fields.appendChild(renderPublishedPageSectionsEditor(item));
        }
        const sectionSettingOptions = {
          "popular": [
            ["videoCount", "表示する動画数", [["4","4件"],["8","8件"],["12","12件"],["16","16件"],["24","24件"],["36","36件"],["48","48件"]]],
            ["columns", "1行のカード数", [["2","2列"],["3","3列"],["4","4列"],["5","5列"]]]
          ],
          "new-releases": [
            ["videoCount", "表示する動画数", [["4","4件"],["8","8件"],["12","12件"],["16","16件"],["24","24件"],["36","36件"],["48","48件"]]],
            ["columns", "1行のカード数", [["2","2列"],["3","3列"],["4","4列"],["5","5列"]]]
          ],
          "categories": [
            ["categoryCount", "表示するカテゴリー数", [["4","4件"],["6","6件"],["8","8件"],["12","12件"],["16","16件"],["20","20件"]]],
            ["columns", "1行の表示数", [["2","2列"],["3","3列"],["4","4列"]]]
          ],
          "genre-rail": [
            ["genreCount", "表示するカテゴリー数", [["4","4件"],["6","6件"],["8","8件"],["10","10件"],["12","12件"]]],
            ["layout", "表示形式", [["rail","横スクロール"],["grid","グリッド"]]]
          ],
          "video-showcase": [
            ["videoCount", "表示する作品数", [["1","1件"],["2","2件"],["3","3件"],["4","4件"],["5","5件"]]],
            ["layout", "レイアウト", [["feature","特集表示"],["grid","カード一覧"]]]
          ],
          "genre-recommendations": [
            ["genreCount", "表示するジャンル数", [["2","2件"],["3","3件"],["4","4件"],["6","6件"]]]
          ],
          "spotlight": [
            ["featureCount", "表示する特集数", [["1","1件"],["2","2件"],["3","3件"]]],
            ["layout", "レイアウト", [["feature","特集表示"],["grid","カード一覧"]]]
          ],
          "library": [
            ["layout", "レイアウト", [["flow","フロー表示"],["cards","カード一覧"]]],
            ["showIcons", "アイコン表示", [["yes","表示する"],["no","表示しない"]]]
          ],
          "creators": [
            ["creatorCount", "表示するクリエイター数", [["3","3人"],["4","4人"],["6","6人"],["8","8人"],["12","12人"]]],
            ["columns", "1行の表示数", [["2","2列"],["3","3列"],["4","4列"]]]
          ],
          "collection": [
            ["videoCount", "表示する作品数", [["3","3件"],["4","4件"],["5","5件"],["6","6件"],["8","8件"]]]
          ]
        };
        const sectionOptions = sectionSettingOptions[item.type];
        if (sectionOptions) {
          const settingsDetails = document.createElement("details");
          settingsDetails.style.cssText = "grid-column:1/-1;border-top:1px solid var(--line,#333);padding-top:10px;";
          const settingsSummary = document.createElement("summary");
          settingsSummary.textContent = "表示内容の設定";
          settingsSummary.style.cursor = "pointer";
          settingsDetails.appendChild(settingsSummary);
          const settingsFields = document.createElement("div");
          settingsFields.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px;";
          item.content.settings = item.content.settings && typeof item.content.settings === "object" ? item.content.settings : {};
          sectionOptions.forEach(function (setting) {
            const label = document.createElement("label");
            label.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
            label.appendChild(document.createTextNode(setting[1]));
            const control = document.createElement("select");
            control.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
            setting[2].forEach(function (optionData) {
              const option = document.createElement("option");
              option.value = optionData[0];
              option.textContent = optionData[1];
              control.appendChild(option);
            });
            const defaults = {
              videoCount: "8",
              columns: "3",
              categoryCount: "8",
              genreCount: "8",
              creatorCount: "4",
              featureCount: "3",
              layout: setting[0] === "layout" && item.type === "genre-rail" ? "rail" : "feature"
            };
            const defaultValue = defaults[setting[0]] || setting[2][0][0];
            const savedValue = item.content.settings[setting[0]];
            control.value = String(savedValue === undefined || savedValue === null || savedValue === "" ? defaultValue : savedValue);
            if (!Array.from(control.options).some(function (option) { return option.value === control.value; })) {
              control.value = defaultValue;
            }
            control.addEventListener("change", function () {
              item.content.settings[setting[0]] = ["layout", "showIcons"].includes(setting[0]) ? control.value : Number(control.value);
            });
            label.appendChild(control);
            settingsFields.appendChild(label);
          });
          settingsDetails.appendChild(settingsFields);
          fields.appendChild(settingsDetails);
        }
        if (item.type !== "custom-page") {
        {
          const layout = document.createElement("label");
          layout.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
          layout.appendChild(document.createTextNode(item.type === "custom-page" ? "ページリンクカードのレイアウト" : "表示レイアウト"));
          const layoutSelect = document.createElement("select");
          layoutSelect.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
          (item.type === "custom-page" ? [
            ["standard", "標準カード"],
            ["wide", "大きなバナー"],
            ["narrow", "画像＋文章"],
            ["editorial", "画像右側の特集"],
            ["poster", "画像重ね合わせバナー"],
            ["compact", "コンパクトリンク"],
            ["center", "シンプル表示"]
          ] : [
            ["standard", "標準"],
            ["wide", "幅いっぱい"],
            ["narrow", "幅を狭く"],
            ["center", "中央揃え"]
          ]).forEach(function (optionData) {
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
        }
        const themeDetails = document.createElement("details");
        themeDetails.style.cssText = "grid-column:1/-1;border-top:1px solid var(--line,#333);padding-top:10px;";
        const themeSummary = document.createElement("summary");
        themeSummary.textContent = "セクションのデザイン設定";
        themeSummary.style.cursor = "pointer";
        themeDetails.appendChild(themeSummary);
        const themeFields = document.createElement("div");
        themeFields.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-top:10px;";
        const sectionTheme = item.content.theme && typeof item.content.theme === "object" ? item.content.theme : (item.content.theme = {});
        themeFields.append(
          field("背景色（HEX）", "themeBg", sectionTheme.bg || "", item, false),
          field("文字色（HEX）", "themeText", sectionTheme.text || "", item, false),
          field("アクセント色（HEX）", "themeAccent", sectionTheme.accent || "", item, false)
        );
        function themeSelect(labelText, key, options, fallback) {
          const label = document.createElement("label");
          label.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
          label.appendChild(document.createTextNode(labelText));
          const input = document.createElement("select");
          input.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
          options.forEach(function (entry) {
            const option = document.createElement("option");
            option.value = entry[0];
            option.textContent = entry[1];
            input.appendChild(option);
          });
          input.value = sectionTheme[key] || fallback;
          input.addEventListener("change", function () {
            sectionTheme[key] = input.value;
            item.content.theme = sectionTheme;
          });
          label.appendChild(input);
          return label;
        }
        themeFields.append(
          themeSelect("コンテンツ幅", "width", [["standard","標準"],["wide","幅広"],["narrow","狭い"]], "standard"),
          themeSelect("上下の余白", "spacing", [["compact","小"],["standard","標準"],["large","大"]], "standard"),
          themeSelect("角丸", "radius", [["rounded","あり"],["square","なし"]], "rounded")
        );
        if (["custom-image", "custom-image-text", "custom-gallery", "custom-cards"].includes(item.type)) {
          themeFields.appendChild(themeSelect("画像の表示方法", "imageFit", [["cover","枠に合わせて表示"],["contain","画像全体を表示"]], "cover"));
        }
        if (item.type === "custom-button") {
          themeFields.appendChild(field("ボタン文字色（HEX）", "themeButtonText", sectionTheme.buttonText || "#111111", item, false));
        }
        themeDetails.appendChild(themeFields);
        fields.appendChild(themeDetails);
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
          fields.appendChild(renderItemsEditor(item));
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
        publishedPages = Array.isArray(data.publishedPages) ? data.publishedPages : [];
        sections = normalize(data.sections, publishedPages);
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
      if (!customTypes.has(def.type) && sections.some(function (item) { return item && item.type === def.type; })) {
        status.textContent = "同じ標準セクションは重複して追加できません。";
        return;
      }
      let id;
      do {
        id = def.type + "-added-" + Date.now() + "-" + (++nextAddedSectionId);
      } while (sections.some(function (item) { return item && item.id === id; }));
      sections.push({ id: id, type: def.type, label: def.label, hidden: false, added: true, order: sections.length, content: {} });
      render();
    });
    const save = document.getElementById("top-save-settings");
    if (save) save.addEventListener("click", async function () {
      sections = sections.map(function (item, index) { return Object.assign({}, item, { order: index }); });
      let pageRecords = null;
      try {
        const parsedPages = JSON.parse(localStorage.getItem("vm-demo-pages") || "null");
        if (Array.isArray(parsedPages)) {
          pageRecords = parsedPages;
          sections.forEach(function (item) {
            if (!item || item.type !== "custom-page" || !Array.isArray(item.content && item.content.topSections)) return;
            const page = pageRecords.find(function (candidate) { return candidate && candidate.id === item.pageId; });
            if (page) page.topSections = JSON.parse(JSON.stringify(item.content.topSections));
          });
        }
      } catch (_) {}
      const serialized = JSON.stringify(sections);
      const pageRecordsSerialized = pageRecords ? JSON.stringify(pageRecords) : null;
      status.textContent = "TOP設定をサーバーに保存しています…";
      save.disabled = true;
      try {
        const editorResponse = await fetch("/api/admin/settings/page-editor", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merge: true, entries: Object.assign({
            "vm-demo-page-sections-top": serialized,
            "vm-demo-homepage-sections": serialized
          }, pageRecordsSerialized ? { "vm-demo-pages": pageRecordsSerialized } : {}) })
        });
        if (!editorResponse.ok) throw new Error("page_editor_save_failed");
        const homepageResponse = await fetch("/api/admin/settings/homepage", {
          method: "PUT", credentials: "same-origin", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sections: sections })
        });
        if (!homepageResponse.ok) throw new Error("homepage_save_failed");
        localStorage.setItem("vm-demo-page-sections-top", serialized);
        localStorage.setItem("vm-demo-homepage-sections", serialized);
        if (pageRecordsSerialized) localStorage.setItem("vm-demo-pages", pageRecordsSerialized);
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

  let homepageSyncSequence = 0;
  async function syncHomepageSections() {
    if (!document.querySelector("main") || !document.querySelector(".hero")) return;
    const syncSequence = ++homepageSyncSequence;
    try {
      const data = await getPublicSettings();
      if (syncSequence !== homepageSyncSequence) return;
      const main = document.querySelector("main");
      main.querySelectorAll(".vm-published-page, .vm-homepage-custom-block, .vm-published-pages").forEach(function (section) { section.remove(); });
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
        const matches = Array.from(document.querySelectorAll(definition.selector));
        if (!matches.length) return;
        originals[definition.key] = matches[0];
        matches.slice(1).forEach(function (duplicate) { duplicate.remove(); });
      });
      const ordered = [];
      const orderedIds = new Set();
      const orderedStandardTypes = new Set();
      const orderedPublishedPageIds = new Set();
      const standardHomepageTypes = new Set(definitions.map(function (definition) { return definition.key; }));
      sections.forEach(function (item) {
        if (!item || typeof item !== "object") return;
        const itemId = typeof item.id === "string" ? item.id : "";
        if (itemId && orderedIds.has(itemId)) return;
        if (itemId) orderedIds.add(itemId);
        if (item.type === "custom-page") {
          const pageId = typeof item.pageId === "string" ? item.pageId : "";
          if (!pageId || orderedPublishedPageIds.has(pageId)) return;
          orderedPublishedPageIds.add(pageId);
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
          const pageSections = Array.isArray(item.content && item.content.topSections) ? item.content.topSections : (Array.isArray(page.topSections) ? page.topSections : (Array.isArray(page.sections) ? page.sections : []));
          if (customPageHidden) customSection.style.setProperty("display", "none", "important");
          customSection.setAttribute("aria-hidden", String(customPageHidden));
          const pageContent = item.content && typeof item.content === "object" ? item.content : {};
          const hasExplicitTopSections = Array.isArray(pageContent.topSections) || Array.isArray(page.topSections);
          const selectedSectionIds = !hasExplicitTopSections && Array.isArray(pageContent.visibleSectionIds)
            ? new Set(pageContent.visibleSectionIds.map(String))
            : null;
          const visiblePageSections = pageSections.filter(function (pageSection) {
            if (!pageSection || typeof pageSection !== "object" || !pageSection.type || pageSection.hidden === true) return false;
            if (hasExplicitTopSections) return true;
            return selectedSectionIds
              ? selectedSectionIds.has(String(pageSection.id))
              : !standardHomepageTypes.has(pageSection.type);
          });
          const hasVisiblePageSections = visiblePageSections.length > 0;
          if (!hasVisiblePageSections) {
            const link = document.createElement("a");
            link.href = page.url;
            const content = item.content && typeof item.content === "object" ? item.content : {};
            const layout = ["standard", "wide", "narrow", "editorial", "poster", "compact", "center"].includes(content.layout) ? content.layout : "standard";
            link.style.cssText = "display:flex;align-items:center;gap:16px;padding:22px 24px;border:1px solid var(--line,#333);border-radius:12px;color:inherit;text-decoration:none;background:rgba(255,255,255,.025);overflow:hidden;";
            if (layout === "wide") link.style.cssText += "flex-direction:column;align-items:stretch;padding:0;background:linear-gradient(135deg,rgba(255,255,255,.06),rgba(255,255,255,.015));";
            if (layout === "narrow") link.style.cssText += "align-items:stretch;";
            if (layout === "editorial") link.style.cssText += "flex-direction:row-reverse;";
            if (layout === "poster") link.style.cssText += "position:relative;min-height:260px;align-items:flex-end;padding:0;background:linear-gradient(110deg,rgba(0,0,0,.82),rgba(0,0,0,.25));";
            if (layout === "compact") link.style.cssText += "gap:10px;padding:12px 16px;border-radius:8px;";
            if (layout === "center") link.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0;border-bottom:1px solid var(--line,#333);color:inherit;text-decoration:none;";
            const previewImage = content.image || page.image;
            const safePreviewImage = previewImage && (previewImage.startsWith("https://") || previewImage.startsWith("http://") || (previewImage.startsWith("/") && !previewImage.startsWith("//")) || previewImage.startsWith("data:image/webp;base64,"));
            if (safePreviewImage) {
              const image = document.createElement("img");
              image.src = previewImage;
              image.alt = "";
              image.loading = "lazy";
              image.style.cssText = "display:block;width:" + (layout === "wide" ? "100%" : layout === "narrow" || layout === "editorial" ? "min(38%,360px)" : "clamp(90px,18vw,180px)") + ";height:" + (layout === "wide" ? "clamp(180px,28vw,360px)" : layout === "narrow" || layout === "editorial" ? "clamp(120px,20vw,240px)" : layout === "poster" ? "100%" : layout === "compact" ? "52px" : "clamp(64px,10vw,110px)") + ";object-fit:cover;border-radius:" + (layout === "wide" || layout === "poster" ? "0" : "8px") + ";flex:0 0 auto;";
              if (layout === "poster") image.style.cssText += "position:absolute;inset:0;width:100%;height:100%;opacity:.42;";
              if (layout !== "center") link.appendChild(image);
            }
            const copy = document.createElement("span");
            copy.style.cssText = "display:grid;gap:9px;min-width:0;flex:1;padding:" + (layout === "wide" ? "24px" : layout === "poster" ? "28px" : "0") + ";" + (layout === "center" ? "display:flex;flex-direction:row;align-items:center;justify-content:space-between;" : layout === "poster" ? "position:relative;z-index:1;color:#fff;" : "");
            const heading = document.createElement("strong");
            heading.textContent = content.title || page.name;
            heading.style.cssText = "font-size:" + (layout === "wide" || layout === "poster" ? "clamp(1.4rem,3vw,2.4rem)" : layout === "compact" ? "clamp(.95rem,1.5vw,1.15rem)" : "clamp(1rem,1.8vw,1.5rem)") + ";line-height:1.3;overflow-wrap:anywhere;";
            copy.appendChild(heading);
            if (typeof content.subtitle === "string" && content.subtitle.trim() && layout !== "center") {
              const description = document.createElement("span");
              description.textContent = content.subtitle.trim();
              description.style.cssText = "line-height:1.7;opacity:.78;overflow-wrap:anywhere;";
              copy.appendChild(description);
            }
            const action = document.createElement("span");
            action.textContent = content.button || "ページを見る →";
            action.style.cssText = "font-weight:700;opacity:.9;";
            copy.appendChild(action);
            link.appendChild(copy);
            customSection.appendChild(link);
          }
          if (visiblePageSections.length) {
            const embeddedContent = document.createElement("div");
            embeddedContent.className = "vm-published-page-content";
            embeddedContent.style.cssText = "display:grid;gap:20px;margin-top:20px;min-width:0;";
            visiblePageSections.forEach(function (pageSection) {
              const content = pageSection.content && typeof pageSection.content === "object" ? pageSection.content : {};
              if (pageSection.type === "popular" || pageSection.type === "categories") {
                const liveSection = document.createElement("section");
                liveSection.className = "vm-published-page-block vm-published-page-block-" + pageSection.type;
                liveSection.dataset.vmEmbeddedPageSection = pageSection.id || pageSection.type;
                liveSection.style.cssText = "box-sizing:border-box;min-width:0;padding:20px 0;border-top:1px solid var(--line,#333);";
                const liveTheme = pageSection.theme && typeof pageSection.theme === "object" ? pageSection.theme : {};
                if (typeof liveTheme.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(liveTheme.bg)) liveSection.style.backgroundColor = liveTheme.bg;
                if (typeof liveTheme.text === "string" && /^#[0-9a-f]{3,8}$/i.test(liveTheme.text)) liveSection.style.color = liveTheme.text;
                const liveTitle = document.createElement("h2");
                liveTitle.textContent = typeof content.title === "string" && content.title.trim() ? content.title.trim() : pageSection.label;
                liveSection.appendChild(liveTitle);
                if (typeof content.subtitle === "string" && content.subtitle.trim()) {
                  const description = document.createElement("p");
                  description.textContent = content.subtitle.trim();
                  description.style.cssText = "line-height:1.7;opacity:.8;margin:8px 0 18px;";
                  liveSection.appendChild(description);
                }
                const liveSettings = pageSection.settings && typeof pageSection.settings === "object"
                  ? pageSection.settings
                  : (content.settings && typeof content.settings === "object" ? content.settings : {});
                const configuredColumns = pageSection.type === "popular"
                  ? Number(liveSettings.columns) || 4
                  : Number(liveSettings.columns) || 3;
                const columnCount = pageSection.type === "popular"
                  ? Math.max(2, Math.min(5, configuredColumns))
                  : Math.max(2, Math.min(4, configuredColumns));
                const grid = document.createElement("div");
                grid.style.cssText = "display:grid;gap:16px;margin-top:16px;min-width:0;";
                const updateColumns = function () {
                  const viewportWidth = window.innerWidth;
                  const columns = viewportWidth <= 520 ? 1 : viewportWidth <= 820 ? Math.min(2, columnCount) : columnCount;
                  grid.style.gridTemplateColumns = "repeat(" + columns + ",minmax(0,1fr))";
                };
                updateColumns();
                window.addEventListener("resize", updateColumns, { passive: true });
                liveSection.appendChild(grid);
                const limit = pageSection.type === "popular"
                  ? Math.max(4, Math.min(24, Number(liveSettings.videoCount) || 8))
                  : Math.max(4, Math.min(20, Number(liveSettings.categoryCount) || 12));
                const params = new URLSearchParams({ type: pageSection.type, locale: "ja", limit: String(limit) });
                fetch("/api/catalog/homepage-sections?" + params.toString(), {
                  credentials: "same-origin",
                  cache: "no-store",
                  headers: { Accept: "application/json" }
                }).then(function (response) {
                  if (!response.ok) throw new Error("homepage_section_unavailable");
                  return response.json();
                }).then(function (payload) {
                  const entries = Array.isArray(payload.data) ? payload.data : [];
                  grid.replaceChildren();
                  if (!entries.length) {
                    const empty = document.createElement("p");
                    empty.textContent = pageSection.type === "popular" ? "人気の動画はまだありません。" : "カテゴリーはまだ登録されていません。";
                    grid.appendChild(empty);
                    return;
                  }
                  entries.forEach(function (entry) {
                    const isPopular = pageSection.type === "popular";
                    const card = document.createElement("a");
                    card.href = isPopular
                      ? "/pages/product-detail.html?productId=" + encodeURIComponent(String(entry.id || ""))
                      : "/pages/category.html?category=" + encodeURIComponent(String(entry.slug || ""));
                    card.style.cssText = "display:grid;align-content:start;gap:8px;min-width:0;padding:14px;border:1px solid var(--line,#333);border-radius:" + (liveTheme.radius === "square" ? "0" : "12px") + ";color:inherit;text-decoration:none;background:rgba(255,255,255,.025);";
                    if (isPopular && typeof entry.thumbnail_url === "string" && entry.thumbnail_url.startsWith("/api/catalog/")) {
                      const image = document.createElement("img");
                      image.src = entry.thumbnail_url;
                      image.alt = "";
                      image.loading = "lazy";
                      image.style.cssText = "display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:8px;";
                      card.appendChild(image);
                    }
                    const heading = document.createElement("strong");
                    heading.textContent = isPopular ? (entry.title || "動画") : (entry.name || "カテゴリー");
                    card.appendChild(heading);
                    const detail = document.createElement("span");
                    if (isPopular) {
                      detail.textContent = entry.seller || "";
                    } else {
                      detail.textContent = Number(entry.product_count || 0).toLocaleString("ja-JP") + "作品";
                    }
                    detail.style.cssText = "font-size:12px;opacity:.75;";
                    card.appendChild(detail);
                    if (isPopular) {
                      const amount = Number(entry.price_amount);
                      if (Number.isFinite(amount)) {
                        const price = document.createElement("strong");
                        price.textContent = entry.price_currency === "JPY"
                          ? "¥" + amount.toLocaleString("ja-JP")
                          : amount.toLocaleString("ja-JP") + " " + String(entry.price_currency || "");
                        card.appendChild(price);
                      }
                    }
                    grid.appendChild(card);
                  });
                }).catch(function () {
                  grid.replaceChildren();
                  const error = document.createElement("p");
                  error.textContent = "セクションの情報を読み込めませんでした。";
                  grid.appendChild(error);
                });
                embeddedContent.appendChild(liveSection);
                return;
              }
              const standardDefinition = definitions.find(function (definition) { return definition.key === pageSection.type; });
              if (standardDefinition) {
                const source = originals[standardDefinition.key];
                if (!source) return;
                const standardPreview = source.cloneNode(true);
                standardPreview.removeAttribute("id");
                standardPreview.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
                standardPreview.querySelectorAll("[data-vm-section-id], [data-vm-section-type]").forEach(function (node) {
                  node.removeAttribute("data-vm-section-id");
                  node.removeAttribute("data-vm-section-type");
                });
                standardPreview.classList.add("vm-published-page-block", "vm-published-page-block-" + pageSection.type);
                standardPreview.dataset.vmEmbeddedPageSection = pageSection.id || pageSection.type;
                standardPreview.hidden = false;
                standardPreview.style.removeProperty("display");
                standardPreview.removeAttribute("aria-hidden");

                const embeddedSettings = pageSection.settings && typeof pageSection.settings === "object"
                  ? pageSection.settings
                  : (content.settings && typeof content.settings === "object" ? content.settings : {});
                const embeddedTheme = pageSection.theme && typeof pageSection.theme === "object"
                  ? pageSection.theme
                  : (content.theme && typeof content.theme === "object" ? content.theme : {});
                const embeddedTitle = typeof content.title === "string" && content.title.trim() ? content.title.trim() : pageSection.label;
                const embeddedSubtitle = typeof content.subtitle === "string" ? content.subtitle.trim() : "";
                const embeddedHeading = standardPreview.querySelector(".section-head h2, .hero-copy h1, .spotlight-copy h2, .finder h2, .library-copy h2, .creator-copy h2, .cta h2, h1, h2");
                if (embeddedHeading && embeddedTitle) embeddedHeading.textContent = embeddedTitle;
                let embeddedDescription = standardPreview.querySelector(".section-head p, .hero-copy > p, .video-showcase-copy, .collection-copy, .spotlight-copy > p, .finder > div > p, .library-copy > p, .creator-copy > p, .cta > p");
                if (embeddedSubtitle) {
                  if (embeddedDescription) {
                    embeddedDescription.textContent = embeddedSubtitle;
                  } else {
                    const sectionHead = standardPreview.querySelector(".section-head");
                    if (sectionHead) {
                      embeddedDescription = document.createElement("p");
                      embeddedDescription.className = "section-description";
                      embeddedDescription.textContent = embeddedSubtitle;
                      const heading = sectionHead.querySelector("h2");
                      if (heading) heading.insertAdjacentElement("afterend", embeddedDescription);
                      else sectionHead.appendChild(embeddedDescription);
                    }
                  }
                }

                if (typeof embeddedTheme.bg === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.bg)) standardPreview.style.backgroundColor = embeddedTheme.bg;
                if (typeof embeddedTheme.text === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.text)) standardPreview.style.color = embeddedTheme.text;
                if (typeof embeddedTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.accent)) standardPreview.style.setProperty("--section-accent", embeddedTheme.accent);
                if (typeof embeddedTheme.radius === "string") standardPreview.style.borderRadius = embeddedTheme.radius === "square" ? "0" : "16px";
                if (typeof embeddedTheme.spacing === "string") standardPreview.style.paddingBlock = embeddedTheme.spacing === "compact" ? "18px" : embeddedTheme.spacing === "large" ? "48px" : "28px";
                if (typeof embeddedTheme.width === "string") {
                  standardPreview.style.maxWidth = embeddedTheme.width === "narrow" ? "900px" : embeddedTheme.width === "wide" ? "none" : embeddedTheme.width === "standard" ? "1200px" : "";
                  standardPreview.style.marginInline = embeddedTheme.width === "narrow" || embeddedTheme.width === "standard" ? "auto" : "";
                }

                const embeddedCardSettings = {
                  popular: { selector: ".video-card", countKey: "videoCount" },
                  "new-releases": { selector: ".video-card", countKey: "videoCount" },
                  categories: { selector: ".cat", countKey: "categoryCount" },
                  "genre-rail": { selector: ".genre-card", countKey: "genreCount" },
                  "genre-recommendations": { selector: ".recommendation-card", countKey: "genreCount" },
                  "video-showcase": { selector: ".showcase-card", countKey: "videoCount" },
                  spotlight: { selector: ".spotlight-stack > .mini", countKey: "featureCount" },
                  creators: { selector: ".creator-list > .person", countKey: "creatorCount" },
                  collection: { selector: ".video-card", countKey: "videoCount" }
                }[pageSection.type];
                if (embeddedCardSettings) {
                  const count = Number(embeddedSettings[embeddedCardSettings.countKey]);
                  if (Number.isFinite(count) && count > 0) {
                    standardPreview.querySelectorAll(embeddedCardSettings.selector).forEach(function (card, index) {
                      card.hidden = index >= count;
                      if (card.hidden) card.style.setProperty("display", "none", "important");
                      else card.style.removeProperty("display");
                    });
                  }
                }
                if (["popular", "new-releases", "collection"].includes(pageSection.type) && [2, 3, 4, 5].includes(Number(embeddedSettings.columns))) {
                  const grid = standardPreview.querySelector(".video-grid");
                  if (grid) grid.style.gridTemplateColumns = "repeat(" + Number(embeddedSettings.columns) + ", minmax(0, 1fr))";
                }
                if (pageSection.type === "categories" && [2, 3, 4].includes(Number(embeddedSettings.columns))) {
                  const grid = standardPreview.querySelector(".category-grid");
                  if (grid) grid.style.gridTemplateColumns = "repeat(" + Number(embeddedSettings.columns) + ", minmax(0, 1fr))";
                }
                if (pageSection.type === "genre-rail") {
                  const track = standardPreview.querySelector(".genre-track");
                  if (track) {
                    track.style.display = embeddedSettings.layout === "grid" ? "grid" : "";
                    track.style.gridTemplateColumns = embeddedSettings.layout === "grid" ? "repeat(auto-fit, minmax(160px, 1fr))" : "";
                  }
                }
                if (pageSection.type === "video-showcase") {
                  const grid = standardPreview.querySelector(".video-showcase-grid");
                  if (grid) grid.style.gridTemplateColumns = embeddedSettings.layout === "grid" ? "repeat(auto-fit, minmax(180px, 1fr))" : "";
                }
                if (pageSection.type === "spotlight") {
                  const stack = standardPreview.querySelector(".spotlight-stack");
                  if (stack) {
                    const useGrid = embeddedSettings.layout === "grid";
                    stack.style.display = useGrid ? "grid" : "";
                    stack.style.gridTemplateColumns = useGrid ? "repeat(auto-fit, minmax(220px, 1fr))" : "";
                    stack.style.gap = useGrid ? "16px" : "";
                  }
                }
                if (pageSection.type === "finder") {
                  standardPreview.querySelectorAll(".find-row span").forEach(function (filter) {
                    filter.hidden = embeddedSettings.searchFields !== "extended";
                  });
                }
                embeddedContent.appendChild(standardPreview);
                return;
              }
              const preview = document.createElement("section");
              preview.className = "vm-published-page-block vm-published-page-block-" + String(pageSection.type).replace(/[^a-z0-9-]/gi, "");
              preview.dataset.vmEmbeddedPageSection = pageSection.id || pageSection.type;
              preview.style.cssText = "box-sizing:border-box;min-width:0;padding:20px 0;border-top:1px solid var(--line,#333);";
              const previewTheme = Object.assign(
                {},
                content.theme && typeof content.theme === "object" ? content.theme : {},
                pageSection.theme && typeof pageSection.theme === "object" ? pageSection.theme : {}
              );
              const previewSettings = pageSection.settings && typeof pageSection.settings === "object"
                ? pageSection.settings
                : (content.settings && typeof content.settings === "object" ? content.settings : {});
              if (typeof previewTheme.bg === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.bg)) preview.style.backgroundColor = previewTheme.bg;
              if (typeof previewTheme.text === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.text)) preview.style.color = previewTheme.text;
              if (typeof previewTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.accent)) preview.style.setProperty("--accent", previewTheme.accent);
              if (previewTheme.radius === "square") preview.style.borderRadius = "0";
              else if (previewTheme.radius === "rounded") preview.style.borderRadius = "12px";
              if (previewTheme.width === "narrow") { preview.style.maxWidth = "900px"; preview.style.marginInline = "auto"; }
              else if (previewTheme.width === "wide") { preview.style.maxWidth = "none"; preview.style.marginInline = "0"; }
              else if (previewTheme.width === "standard") { preview.style.maxWidth = "1200px"; preview.style.marginInline = "auto"; }
              if (pageSection.type === "custom-divider" || pageSection.type === "custom-spacer") {
                preview.style.padding = "0";
                preview.style.marginBlock = previewTheme.spacing === "compact" ? "8px" : previewTheme.spacing === "large" ? "32px" : "18px";
                if (pageSection.type === "custom-divider") {
                  const divider = document.createElement("hr");
                  divider.style.cssText = "border:0;border-top:1px solid " + (typeof previewTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.accent) ? previewTheme.accent : "var(--line,#333)") + ";width:100%;margin:0;";
                  preview.appendChild(divider);
                } else {
                  const spacer = document.createElement("div");
                  spacer.setAttribute("aria-hidden", "true");
                  const configuredHeight = Number(previewSettings.height);
                  spacer.style.height = String(Number.isFinite(configuredHeight) ? Math.max(16, Math.min(240, configuredHeight)) : 64) + "px";
                  preview.appendChild(spacer);
                }
                embeddedContent.appendChild(preview);
                return;
              }
              if (previewTheme.spacing === "compact") preview.style.paddingBlock = "12px";
              else if (previewTheme.spacing === "large") preview.style.paddingBlock = "48px";
              else if (previewTheme.spacing === "standard") preview.style.paddingBlock = "28px";
              const title = typeof content.title === "string" && content.title.trim() ? content.title.trim() : pageSection.label;
              const imageUrl = typeof content.image === "string" ? content.image.trim() : "";
              const validImageUrl = imageUrl && (/^https?:\/\//i.test(imageUrl) || (/^\/(?!\/)/.test(imageUrl)) || /^data:image\/webp;base64,[A-Za-z0-9+/=]+$/.test(imageUrl));
              const imageTextLayout = pageSection.type === "custom-image-text" ? document.createElement("div") : null;
              const imageTextCopy = imageTextLayout ? document.createElement("div") : preview;
              if (imageTextLayout) {
                imageTextLayout.className = "vm-published-page-image-text";
                imageTextLayout.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:center;gap:24px;width:100%;";
                imageTextCopy.className = "vm-published-page-image-text-copy";
                imageTextCopy.style.cssText = "display:grid;align-content:center;gap:10px;min-width:0;";
              }
              if (title) {
                const heading = document.createElement("h2");
                heading.textContent = title;
                imageTextCopy.appendChild(heading);
              }
              if (typeof content.subtitle === "string" && content.subtitle.trim()) {
                const description = document.createElement("p");
                description.textContent = content.subtitle.trim();
                description.style.lineHeight = "1.7";
                imageTextCopy.appendChild(description);
              }
              if (typeof content.body === "string" && content.body.trim()) {
                const body = document.createElement("div");
                body.textContent = content.body.trim();
                body.style.cssText = "white-space:pre-line;line-height:1.8;overflow-wrap:anywhere;";
                imageTextCopy.appendChild(body);
              }
              if (validImageUrl) {
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = title || "";
                image.loading = "lazy";
                image.style.cssText = "display:block;width:100%;max-width:100%;max-height:420px;object-fit:" + (previewTheme.imageFit === "contain" ? "contain" : "cover") + ";border-radius:" + (previewTheme.radius === "square" ? "0" : "12px") + ";margin:0;";
                if (imageTextLayout) imageTextLayout.appendChild(image);
                else preview.appendChild(image);
              }
              if (imageTextLayout) {
                imageTextLayout.appendChild(imageTextCopy);
                preview.appendChild(imageTextLayout);
              }
              const embeddedItems = Array.isArray(pageSection.items)
                ? pageSection.items
                : (Array.isArray(content.items) ? content.items : []);
              if (pageSection.type === "custom-gallery") {
                const gallery = document.createElement("div");
                const configuredColumns = Number(previewSettings.columns ?? content.columns);
                const columnCount = [2, 3, 4, 5].includes(configuredColumns) ? configuredColumns : 3;
                const updateGalleryColumns = function () {
                  const viewportWidth = window.innerWidth;
                  const columns = viewportWidth <= 520 ? 1 : viewportWidth <= 820 ? Math.min(2, columnCount) : columnCount;
                  gallery.style.gridTemplateColumns = "repeat(" + columns + ",minmax(0,1fr))";
                };
                gallery.style.cssText = "display:grid;gap:12px;margin-top:16px;min-width:0;";
                updateGalleryColumns();
                window.addEventListener("resize", updateGalleryColumns, { passive: true });
                embeddedItems.forEach(function (entry) {
                  if (!entry || typeof entry !== "object") return;
                  const imageUrl = typeof entry.image === "string" ? entry.image.trim() : "";
                  const validImage = /^https?:\/\//i.test(imageUrl) || /^\/(?!\/)/.test(imageUrl) || /^data:image\/(?:webp|png|jpe?g);base64,/i.test(imageUrl);
                  const link = typeof entry.link === "string" ? entry.link.trim() : "";
                  const validLink = /^https?:\/\//i.test(link) || /^\/(?!\/)/.test(link);
                  if (!validImage && !(typeof entry.title === "string" && entry.title.trim())) return;
                  const tile = document.createElement(validLink ? "a" : "div");
                  if (validLink) tile.href = link;
                  tile.style.cssText = "display:grid;gap:6px;min-width:0;overflow:hidden;border-radius:" + (previewTheme.radius === "square" ? "0" : "10px") + ";";
                  if (validImage) {
                    const image = document.createElement("img");
                    image.src = imageUrl;
                    image.alt = typeof entry.title === "string" ? entry.title : "";
                    image.loading = "lazy";
                    image.style.cssText = "display:block;width:100%;aspect-ratio:16/9;object-fit:" + (previewTheme.imageFit === "contain" ? "contain" : "cover") + ";";
                    tile.appendChild(image);
                  }
                  if (typeof entry.title === "string" && entry.title.trim()) {
                    const caption = document.createElement("span");
                    caption.textContent = entry.title.trim();
                    tile.appendChild(caption);
                  }
                  gallery.appendChild(tile);
                });
                if (gallery.children.length) preview.appendChild(gallery);
              } else if (embeddedItems.length) {
                const list = document.createElement("div");
                const previewColumns = Number(previewSettings.columns ?? content.columns);
                list.style.cssText = "display:grid;grid-template-columns:" + ([2, 3, 4, 5].includes(previewColumns) ? "repeat(" + previewColumns + ", minmax(0, 1fr))" : "repeat(auto-fit,minmax(180px,1fr))") + ";gap:12px;";
                embeddedItems.forEach(function (entry) {
                  if (!entry || typeof entry !== "object") return;
                  const card = document.createElement("article");
                  card.style.cssText = "min-width:0;padding:14px;border:1px solid var(--line,#333);border-radius:" + (previewTheme.radius === "square" ? "0" : "10px") + ";";
                  if (typeof entry.image === "string" && (entry.image.startsWith("https://") || entry.image.startsWith("http://") || (entry.image.startsWith("/") && !entry.image.startsWith("//")))) {
                    const itemImage = document.createElement("img");
                    itemImage.src = entry.image;
                    itemImage.alt = "";
                    itemImage.loading = "lazy";
                    itemImage.style.cssText = "width:100%;aspect-ratio:16/9;object-fit:" + (previewTheme.imageFit === "contain" ? "contain" : "cover") + ";border-radius:" + (previewTheme.radius === "square" ? "0" : "8px") + ";";
                    card.appendChild(itemImage);
                  }
                  if (typeof entry.title === "string" && entry.title.trim()) {
                    const itemTitle = document.createElement("strong");
                    itemTitle.textContent = entry.title.trim();
                    card.appendChild(itemTitle);
                  }
                  if (typeof entry.description === "string" && entry.description.trim()) {
                    const itemDescription = document.createElement("p");
                    itemDescription.textContent = entry.description.trim();
                    card.appendChild(itemDescription);
                  }
                  if (typeof entry.button === "string" && entry.button.trim() && typeof entry.link === "string" && (/^https?:\/\//i.test(entry.link.trim()) || /^\/(?!\/)/.test(entry.link.trim()))) {
                    const itemButton = document.createElement("a");
                    itemButton.textContent = entry.button.trim();
                    itemButton.href = entry.link.trim();
                    itemButton.style.cssText = "display:inline-block;margin-top:10px;color:var(--accent,#d9b45f);font-weight:700;";
                    card.appendChild(itemButton);
                  }
                  list.appendChild(card);
                });
                preview.appendChild(list);
              }
              if (typeof content.button === "string" && content.button.trim() && typeof content.link === "string" && (/^https?:\/\//i.test(content.link.trim()) || /^\/(?!\/)/.test(content.link.trim()))) {
                const action = document.createElement("a");
                action.textContent = content.button.trim();
                action.href = content.link.trim();
                action.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:16px;padding:10px 18px;border-radius:" + (previewTheme.radius === "square" ? "0" : "8px") + ";background:var(--accent,#d9b45f);color:" + (typeof previewTheme.buttonText === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.buttonText) ? previewTheme.buttonText : "#111111") + ";font-weight:700;text-decoration:none;";
                if (pageSection.type === "custom-image-text") imageTextCopy.appendChild(action);
                else preview.appendChild(action);
              }
              if (pageSection.type === "custom-button" && !content.button) preview.style.minHeight = "1px";
              embeddedContent.appendChild(preview);
            });
            customSection.appendChild(embeddedContent);
          }
          ordered.push(customSection);
          return;
        }
        if (["custom-text", "custom-image", "custom-image-text", "custom-gallery", "custom-cards", "custom-button", "custom-divider", "custom-spacer"].includes(item.type)) {
          const customSection = document.createElement("section");
          customSection.className = "section vm-homepage-custom-block vm-homepage-" + item.type;
          customSection.dataset.vmSectionId = item.id || item.type;
          customSection.dataset.vmSectionType = item.type;
          const customContent = item.content && typeof item.content === "object" ? item.content : {};
          const customSettings = item.settings && typeof item.settings === "object" ? item.settings : (customContent.settings && typeof customContent.settings === "object" ? customContent.settings : {});
          const layout = customContent.layout || "standard";
          customSection.style.cssText = "box-sizing:border-box;width:100%;padding:32px 5%;";
          const savedCustomTheme = customContent.theme && typeof customContent.theme === "object" ? customContent.theme : {};
          const storedCustomTheme = data.themes && data.themes[item.id] && typeof data.themes[item.id] === "object" ? data.themes[item.id] : {};
          const customTheme = Object.assign({}, storedCustomTheme, savedCustomTheme);
          if (typeof customTheme.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(customTheme.bg)) customSection.style.backgroundColor = customTheme.bg;
          if (typeof customTheme.text === "string" && /^#[0-9a-f]{3,8}$/i.test(customTheme.text)) customSection.style.color = customTheme.text;
          if (typeof customTheme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(customTheme.accent)) customSection.style.setProperty("--accent", customTheme.accent);
          if (typeof customTheme.radius === "string") customSection.style.borderRadius = customTheme.radius === "square" ? "0" : "16px";
          const customImageFit = customTheme.imageFit === "contain" ? "contain" : "cover";
          const customButtonText = typeof customTheme.buttonText === "string" && /^#[0-9a-f]{6}$/i.test(customTheme.buttonText) ? customTheme.buttonText : "#111";
          if (typeof customTheme.spacing === "string") customSection.style.paddingBlock = customTheme.spacing === "compact" ? "12px" : customTheme.spacing === "large" ? "48px" : "28px";
          if (typeof customTheme.width === "string") {
            customSection.style.maxWidth = customTheme.width === "narrow" ? "900px" : customTheme.width === "wide" ? "none" : "1200px";
            customSection.style.marginInline = customTheme.width === "wide" ? "0" : "auto";
          }
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
            imageTextCopy.appendChild(element);
            return element;
          }
          const imageTextLayout = item.type === "custom-image-text" ? document.createElement("div") : null;
          const imageTextCopy = imageTextLayout ? document.createElement("div") : customSection;
          if (imageTextLayout) {
            imageTextLayout.className = "vm-homepage-custom-image-text-layout";
            imageTextLayout.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr));align-items:center;gap:24px;width:100%;";
            imageTextCopy.className = "vm-homepage-custom-image-text-copy";
            imageTextCopy.style.cssText = "display:grid;align-content:center;gap:10px;min-width:0;";
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
              imageTextCopy.appendChild(paragraph);
            }
          }
          const imageUrl = typeof customContent.image === "string" ? customContent.image.trim() : "";
          if ((item.type === "custom-image" || item.type === "custom-image-text") && imageUrl &&
              (imageUrl.startsWith("https://") || imageUrl.startsWith("http://") || (imageUrl.startsWith("/") && !imageUrl.startsWith("//")))) {
            const image = document.createElement("img");
            image.src = imageUrl;
            image.alt = customContent.title || "";
            image.loading = "lazy";
            image.style.cssText = "display:block;width:100%;max-width:100%;max-height:520px;object-fit:" + customImageFit + ";border-radius:" + (customTheme.radius === "square" ? "0" : "12px") + ";margin:0;";
            if (imageTextLayout) imageTextLayout.appendChild(image);
            else customSection.appendChild(image);
          }
          if (imageTextLayout) {
            imageTextLayout.appendChild(imageTextCopy);
            customSection.appendChild(imageTextLayout);
          }
          if (item.type === "custom-gallery" || item.type === "custom-cards") {
            const grid = document.createElement("div");
            const configuredColumns = Number(customSettings.columns ?? customContent.columns);
            const columnCount = [2, 3, 4, 5].includes(configuredColumns) ? configuredColumns : 3;
            grid.className = "vm-homepage-custom-grid";
            grid.dataset.columns = String(columnCount);
            grid.style.cssText = "display:grid;gap:16px;margin-top:18px;";
            const updateGridColumns = function () {
              const viewportWidth = window.innerWidth;
              const responsiveColumns = viewportWidth <= 420 ? 1 : viewportWidth <= 620 ? 2 : viewportWidth <= 900 ? 3 : columnCount;
              grid.style.gridTemplateColumns = "repeat(" + responsiveColumns + ",minmax(0,1fr))";
            };
            updateGridColumns();
            window.addEventListener("resize", updateGridColumns, { passive: true });
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
              card.style.cssText = "display:grid;align-content:start;gap:8px;min-width:0;padding:14px;border:1px solid var(--line,#333);border-radius:" + (customTheme.radius === "square" ? "0" : "12px") + ";color:inherit;text-decoration:none;background:rgba(255,255,255,.025);";
              if (entry.image && (entry.image.startsWith("https://") || entry.image.startsWith("http://") || (entry.image.startsWith("/") && !entry.image.startsWith("//")) || /^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(entry.image))) {
                const image = document.createElement("img");
                image.src = entry.image;
                image.alt = "";
                image.loading = "lazy";
                image.style.cssText = "width:100%;aspect-ratio:16/9;object-fit:" + customImageFit + ";border-radius:" + (customTheme.radius === "square" ? "0" : "8px") + ";";
                card.appendChild(image);
              }
              if (entry.title) { const heading = document.createElement("strong"); heading.textContent = entry.title; card.appendChild(heading); }
              if (entry.description) { const description = document.createElement("p"); description.textContent = entry.description; card.appendChild(description); }
              if (entry.button) { const action = document.createElement("span"); action.textContent = entry.button; action.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:8px;padding:8px 12px;border-radius:" + (customTheme.radius === "square" ? "0" : "8px") + ";background:var(--accent,#d9b45f);color:" + customButtonText + ";font-weight:700;"; card.appendChild(action); }
              grid.appendChild(card);
            });
            customSection.appendChild(grid);
          }
          if ((item.type === "custom-button" || item.type === "custom-image-text") && customContent.button) {
            const button = document.createElement("a");
            button.textContent = customContent.button;
            button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:12px 20px;border-radius:" + (customTheme.radius === "square" ? "0" : "999px") + ";background:var(--accent,#d9b45f);color:" + customButtonText + ";text-decoration:none;font-weight:700;";
            const link = String(customContent.link || "");
            if (link.startsWith("/") && !link.startsWith("//")) button.href = link;
            else { try { const url = new URL(link); if (url.protocol === "https:" || url.protocol === "http:") button.href = url.href; } catch (_) {} }
            if (item.type === "custom-image-text") imageTextCopy.appendChild(button);
            else customSection.appendChild(button);
          }
          if (item.type === "custom-divider") {
            const divider = document.createElement("hr");
            divider.style.cssText = "border:0;border-top:1px solid " + (typeof customTheme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(customTheme.accent) ? customTheme.accent : "var(--line,#333)") + ";margin:0 auto;width:100%;";
            customSection.appendChild(divider);
          }
          if (item.type === "custom-spacer") {
            const spacer = document.createElement("div");
            spacer.setAttribute("aria-hidden", "true");
            const configuredHeight = Number(customSettings.height);
            spacer.style.height = (Number.isFinite(configuredHeight) ? Math.max(16, Math.min(240, configuredHeight)) : 64) + "px";
            customSection.appendChild(spacer);
          }
          ordered.push(customSection);
          return;
        }
        if (standardHomepageTypes.has(item.type)) {
          if (orderedStandardTypes.has(item.type)) return;
          orderedStandardTypes.add(item.type);
        }
        let section = originals[item.id] || originals[item.type] || null;
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
        const displaySettings = item.settings && typeof item.settings === "object"
          ? item.settings
          : (sectionContent.settings && typeof sectionContent.settings === "object" ? sectionContent.settings : {});
        if (item.type === "trustbar") {
          const itemCount = Number(displaySettings.itemCount);
          Array.from(section.querySelectorAll(":scope > div")).forEach(function (entry, index) {
            entry.hidden = Number.isFinite(itemCount) && itemCount > 0 && index >= itemCount;
          });
        }
        if (item.type === "hero") {
          const heroBackground = section.querySelector(".hero-bg");
          const heroHeight = { compact: "420px", standard: "", large: "760px" }[displaySettings.height] || "";
          section.style.minHeight = heroHeight;
          if (heroBackground) {
            heroBackground.style.backgroundPosition = displaySettings.imagePosition === "left" ? "left center" : displaySettings.imagePosition === "right" ? "right center" : "center";
          }
        }
        const sectionCardSettings = {
          "popular": { selector: ".video-card", countKey: "videoCount" },
          "new-releases": { selector: ".video-card", countKey: "videoCount" },
          "categories": { selector: ".cat", countKey: "categoryCount" },
          "genre-rail": { selector: ".genre-card", countKey: "genreCount" },
          "genre-recommendations": { selector: ".recommendation-card", countKey: "genreCount" },
          "video-showcase": { selector: ".showcase-card", countKey: "videoCount" },
          "spotlight": { selector: ".spotlight-stack > .mini", countKey: "featureCount" },
          "creators": { selector: ".creator-list > .person", countKey: "creatorCount" },
          "collection": { selector: ".video-card", countKey: "videoCount" }
        };
        const cardSettings = sectionCardSettings[item.type];
        if (cardSettings) {
          const cards = Array.from(section.querySelectorAll(cardSettings.selector));
          const count = Number(displaySettings[cardSettings.countKey]);
          if (Number.isFinite(count) && count > 0) {
            cards.forEach(function (card, index) {
              card.hidden = index >= count;
              if (card.hidden) card.style.setProperty("display", "none", "important");
              else card.style.removeProperty("display");
            });
          }
        }
        if (["popular", "new-releases", "collection"].includes(item.type) && [2, 3, 4, 5].includes(Number(displaySettings.columns))) {
          const cardGrid = section.querySelector("#videos, .video-grid");
          if (cardGrid) cardGrid.style.gridTemplateColumns = "repeat(" + Number(displaySettings.columns) + ", minmax(0, 1fr))";
        }
        if (item.type === "categories" && [2, 3, 4].includes(Number(displaySettings.columns))) {
          const categoryGrid = section.querySelector(".category-grid");
          if (categoryGrid) categoryGrid.style.gridTemplateColumns = "repeat(" + Number(displaySettings.columns) + ", minmax(0, 1fr))";
        }
        if (item.type === "creators" && [2, 3, 4].includes(Number(displaySettings.columns))) {
          const creatorGrid = section.querySelector(".creator-list");
          if (creatorGrid) creatorGrid.style.gridTemplateColumns = "repeat(" + Number(displaySettings.columns) + ", minmax(0, 1fr))";
        }
        if (item.type === "genre-rail") {
          const genreTrack = section.querySelector(".genre-track");
          if (genreTrack && displaySettings.layout === "grid") {
            genreTrack.style.display = "grid";
            genreTrack.style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
          } else if (genreTrack) {
            genreTrack.style.display = "";
            genreTrack.style.gridTemplateColumns = "";
          }
        }
        if (item.type === "video-showcase") {
          const showcaseGrid = section.querySelector(".video-showcase-grid");
          if (showcaseGrid) showcaseGrid.style.gridTemplateColumns = displaySettings.layout === "grid" ? "repeat(auto-fit, minmax(180px, 1fr))" : "";
        }
        if (item.type === "spotlight") {
          const spotlightStack = section.querySelector(".spotlight-stack");
          if (spotlightStack) {
            const useGridLayout = displaySettings.layout === "grid";
            spotlightStack.style.display = useGridLayout ? "grid" : "";
            spotlightStack.style.gridTemplateColumns = useGridLayout ? "repeat(auto-fit, minmax(220px, 1fr))" : "";
            spotlightStack.style.gap = useGridLayout ? "16px" : "";
          }
        }
        if (item.type === "finder") {
          section.querySelectorAll(".find-row span").forEach(function (filter) {
            filter.hidden = displaySettings.searchFields !== "extended";
          });
        }
        if (item.type === "collection") {
          const grid = section.querySelector(".video-grid");
          if (grid) {
            const editorial = displaySettings.layout === "editorial";
            grid.style.gridTemplateColumns = editorial ? "minmax(0, 1fr)" : "";
            grid.querySelectorAll(".video-card").forEach(function (card) {
              card.style.display = editorial ? "grid" : "";
              card.style.gridTemplateColumns = editorial ? "minmax(0, 1.2fr) minmax(0, 1fr)" : "";
              card.style.alignItems = editorial ? "stretch" : "";
            });
          }
        }
        if (item.type === "library") {
          const flow = section.querySelector(".library-flow");
          if (flow) {
            const useCards = displaySettings.layout === "cards";
            flow.style.display = useCards ? "grid" : "";
            flow.style.gridTemplateColumns = useCards ? "repeat(auto-fit, minmax(120px, 1fr))" : "";
            flow.querySelectorAll(".flow-line").forEach(function (line) { line.hidden = useCards; });
            flow.querySelectorAll(".flow-card > span").forEach(function (icon) { icon.hidden = displaySettings.showIcons === "no"; });
          }
        }
        if (item.type === "creator") {
          const copy = section.querySelector(".creator-copy");
          const art = section.querySelector(".creator-art");
          const centered = displaySettings.layout === "centered";
          section.style.gridTemplateColumns = centered ? "minmax(0, 1fr)" : "";
          if (copy) copy.style.textAlign = centered ? "center" : "";
          if (art) { art.style.maxWidth = centered ? "320px" : ""; art.style.marginInline = centered ? "auto" : ""; }
          section.querySelectorAll(".creator-points").forEach(function (points) { points.style.justifyContent = centered ? "center" : ""; });
        }
        if (item.type === "cta") {
          const centered = displaySettings.layout === "centered";
          section.style.textAlign = centered ? "center" : "";
          section.querySelectorAll(":scope > div:last-child").forEach(function (actions) { actions.style.justifyContent = centered ? "center" : ""; });
        }
        const sectionLayout = ["standard", "wide", "narrow", "center"].includes(sectionContent.layout) ? sectionContent.layout : "standard";
        if (sectionLayout === "wide") {
          section.style.maxWidth = "none";
          section.style.marginInline = "0";
          section.style.paddingInline = "2%";
        } else if (sectionLayout === "narrow") {
          section.style.maxWidth = "900px";
          section.style.marginInline = "auto";
          section.style.paddingInline = "24px";
        } else {
          section.style.maxWidth = "";
          section.style.marginInline = "";
          section.style.paddingInline = "";
        }
        if (sectionLayout === "center") {
          section.style.textAlign = "center";
          section.querySelectorAll(".section-head").forEach(function (head) {
            head.style.justifyContent = "center";
            head.style.textAlign = "center";
          });
        } else {
          if (!(item.type === "cta" && displaySettings.layout === "centered")) {
            section.style.textAlign = "";
          }
          section.querySelectorAll(".section-head").forEach(function (head) {
            head.style.justifyContent = "";
            head.style.textAlign = "";
          });
        }
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
        const savedTheme = sectionContent.theme && typeof sectionContent.theme === "object" ? sectionContent.theme : null;
        const theme = savedTheme || (data.themes && data.themes[item.id]);
        if (theme && typeof theme === "object") {
          if (typeof theme.bg === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.bg)) section.style.backgroundColor = theme.bg;
          if (typeof theme.text === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.text)) section.style.color = theme.text;
          if (typeof theme.accent === "string" && /^#[0-9a-f]{3,8}$/i.test(theme.accent)) section.style.setProperty("--section-accent", theme.accent);
          if (typeof theme.radius === "string") section.style.borderRadius = theme.radius === "square" ? "0" : "16px";
          if (typeof theme.spacing === "string") section.style.paddingBlock = theme.spacing === "compact" ? "18px" : theme.spacing === "large" ? "64px" : "36px";
          if (typeof theme.width === "string") {
            section.style.maxWidth = theme.width === "narrow" ? "900px" : theme.width === "wide" ? "none" : "";
            section.style.marginInline = theme.width === "narrow" ? "auto" : "";
            if (theme.width === "wide") section.style.paddingInline = "2%";
          }
        }
        ordered.push(section);
      });
      // Keep standard homepage sections available when older saved settings omit an entry.
      // An explicit saved item (including hidden:true) remains authoritative.
      const configuredTypes = new Set(sections
        .filter(function (item) { return item && typeof item === "object"; })
        .map(function (item) { return item.type; }));
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