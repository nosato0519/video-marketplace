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
              item.content.settings[setting[0]] = setting[0] === "layout" ? control.value : Number(control.value);
            });
            label.appendChild(control);
            settingsFields.appendChild(label);
          });
          settingsDetails.appendChild(settingsFields);
          fields.appendChild(settingsDetails);
        }
        {
          const layout = document.createElement("label");
          layout.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
          layout.appendChild(document.createTextNode("表示レイアウト"));
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

          const pageSections = Array.isArray(page.sections) ? page.sections : [];
          if (pageSections.length) {
            const embeddedContent = document.createElement("div");
            embeddedContent.className = "vm-published-page-content";
            embeddedContent.style.cssText = "display:grid;gap:20px;margin-top:20px;min-width:0;";
            pageSections.forEach(function (pageSection) {
              if (!pageSection || typeof pageSection !== "object" || !pageSection.type) return;
              const sourceDefinition = definitions.find(function (definition) { return definition.key === pageSection.type; });
              const source = sourceDefinition && originals[pageSection.type];
              if (source) {
                const embeddedSection = source.cloneNode(true);
                embeddedSection.removeAttribute("id");
                embeddedSection.querySelectorAll("[id]").forEach(function (node) { node.removeAttribute("id"); });
                embeddedSection.dataset.vmEmbeddedPageSection = pageSection.id || pageSection.type;
                embeddedSection.style.maxWidth = "none";
                embeddedSection.style.marginInline = "0";
                const embeddedHeading = embeddedSection.querySelector(".section-head h2, h2");
                if (embeddedHeading && pageSection.label) embeddedHeading.textContent = pageSection.label;
                const embeddedSectionContent = pageSection.content && typeof pageSection.content === "object" ? pageSection.content : {};
                const embeddedSettings = pageSection.settings && typeof pageSection.settings === "object"
                  ? pageSection.settings
                  : (embeddedSectionContent.settings && typeof embeddedSectionContent.settings === "object" ? embeddedSectionContent.settings : {});
                const embeddedTheme = pageSection.theme && typeof pageSection.theme === "object"
                  ? pageSection.theme
                  : (embeddedSectionContent.theme && typeof embeddedSectionContent.theme === "object" ? embeddedSectionContent.theme : {});
                if (typeof embeddedTheme.bg === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.bg)) embeddedSection.style.backgroundColor = embeddedTheme.bg;
                if (typeof embeddedTheme.text === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.text)) embeddedSection.style.color = embeddedTheme.text;
                if (typeof embeddedTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.accent)) embeddedSection.style.setProperty("--accent", embeddedTheme.accent);
                if (embeddedTheme.width === "narrow") {
                  embeddedSection.style.maxWidth = "900px";
                  embeddedSection.style.marginInline = "auto";
                } else if (embeddedTheme.width === "wide") {
                  embeddedSection.style.maxWidth = "none";
                  embeddedSection.style.marginInline = "0";
                } else if (embeddedTheme.width === "standard") {
                  embeddedSection.style.maxWidth = "1200px";
                  embeddedSection.style.marginInline = "auto";
                }
                if (embeddedTheme.spacing === "compact") embeddedSection.style.paddingBlock = "12px";
                else if (embeddedTheme.spacing === "large") embeddedSection.style.paddingBlock = "48px";
                else if (embeddedTheme.spacing === "standard") embeddedSection.style.paddingBlock = "28px";
                const embeddedCards = embeddedSection.querySelectorAll(".video-card, .cat, .genre-card, .recommendation-card, .showcase-card, .mini, .person, .collection-card");
                if (embeddedTheme.radius === "square") {
                  embeddedCards.forEach(function (card) { card.style.borderRadius = "0"; });
                  embeddedSection.querySelectorAll("img").forEach(function (image) { image.style.borderRadius = "0"; });
                } else if (embeddedTheme.radius === "rounded") {
                  embeddedCards.forEach(function (card) { card.style.borderRadius = "12px"; });
                }
                if (embeddedTheme.imageFit === "contain" || embeddedTheme.imageFit === "cover") {
                  embeddedSection.querySelectorAll("img").forEach(function (image) { image.style.objectFit = embeddedTheme.imageFit; });
                }
                if (typeof embeddedTheme.buttonText === "string" && /^#[0-9a-f]{6}$/i.test(embeddedTheme.buttonText)) {
                  embeddedSection.querySelectorAll("button, .btn, a.button").forEach(function (button) { button.style.color = embeddedTheme.buttonText; });
                }
                const embeddedColumns = Number(embeddedSettings.columns);
                const embeddedGrid = pageSection.type === "categories"
                  ? embeddedSection.querySelector(".category-grid")
                  : embeddedSection.querySelector("#videos, .video-grid, .creator-list");
                if (embeddedGrid && [2, 3, 4, 5].includes(embeddedColumns)) {
                  embeddedGrid.style.gridTemplateColumns = "repeat(" + embeddedColumns + ", minmax(0, 1fr))";
                }
                const embeddedCardRules = {
                  "popular": [".video-card", "videoCount"],
                  "new-releases": [".video-card", "videoCount"],
                  "categories": [".cat", "categoryCount"],
                  "genre-rail": [".genre-card", "genreCount"],
                  "genre-recommendations": [".recommendation-card", "genreCount"],
                  "video-showcase": [".showcase-card", "videoCount"],
                  "spotlight": [".spotlight-stack > .mini", "featureCount"],
                  "creators": [".creator-list > .person", "creatorCount"],
                  "collection": [".video-card", "videoCount"]
                };
                const embeddedCardRule = embeddedCardRules[pageSection.type];
                if (embeddedCardRule) {
                  const embeddedCount = Number(embeddedSettings[embeddedCardRule[1]]);
                  if (Number.isFinite(embeddedCount) && embeddedCount > 0) {
                    Array.from(embeddedSection.querySelectorAll(embeddedCardRule[0])).forEach(function (card, cardIndex) {
                      card.hidden = cardIndex >= embeddedCount;
                      if (card.hidden) card.style.setProperty("display", "none", "important");
                      else card.style.removeProperty("display");
                    });
                  }
                }
                if (pageSection.type === "genre-rail") {
                  const embeddedGenreTrack = embeddedSection.querySelector(".genre-track");
                  if (embeddedGenreTrack && embeddedSettings.layout === "grid") {
                    embeddedGenreTrack.style.display = "grid";
                    embeddedGenreTrack.style.gridTemplateColumns = "repeat(auto-fit, minmax(160px, 1fr))";
                  } else if (embeddedGenreTrack) {
                    embeddedGenreTrack.style.display = "";
                    embeddedGenreTrack.style.gridTemplateColumns = "";
                  }
                }
                if (pageSection.type === "video-showcase") {
                  const embeddedShowcaseGrid = embeddedSection.querySelector(".video-showcase-grid");
                  if (embeddedShowcaseGrid) {
                    embeddedShowcaseGrid.style.gridTemplateColumns = embeddedSettings.layout === "grid" ? "repeat(auto-fit, minmax(180px, 1fr))" : "";
                  }
                }
                if (pageSection.type === "spotlight") {
                  const embeddedSpotlightStack = embeddedSection.querySelector(".spotlight-stack");
                  if (embeddedSpotlightStack) {
                    const useGridLayout = embeddedSettings.layout === "grid";
                    embeddedSpotlightStack.style.display = useGridLayout ? "grid" : "";
                    embeddedSpotlightStack.style.gridTemplateColumns = useGridLayout ? "repeat(auto-fit, minmax(220px, 1fr))" : "";
                    embeddedSpotlightStack.style.gap = useGridLayout ? "16px" : "";
                  }
                }
                if (pageSection.type === "finder") {
                  embeddedSection.querySelectorAll(".find-row span").forEach(function (filter) {
                    filter.hidden = embeddedSettings.searchFields !== "extended";
                  });
                }
                if (pageSection.type === "collection") {
                  const grid = embeddedSection.querySelector(".video-grid");
                  if (grid) {
                    const editorial = embeddedSettings.layout === "editorial";
                    grid.style.gridTemplateColumns = editorial ? "minmax(0, 1fr)" : "";
                    grid.querySelectorAll(".video-card").forEach(function (card) {
                      card.style.display = editorial ? "grid" : "";
                      card.style.gridTemplateColumns = editorial ? "minmax(0, 1.2fr) minmax(0, 1fr)" : "";
                      card.style.alignItems = editorial ? "stretch" : "";
                    });
                  }
                }
                if (pageSection.type === "library") {
                  const flow = embeddedSection.querySelector(".library-flow");
                  if (flow) {
                    const useCards = embeddedSettings.layout === "cards";
                    flow.style.display = useCards ? "grid" : "";
                    flow.style.gridTemplateColumns = useCards ? "repeat(auto-fit, minmax(120px, 1fr))" : "";
                    flow.querySelectorAll(".flow-line").forEach(function (line) { line.hidden = useCards; });
                    flow.querySelectorAll(".flow-card > span").forEach(function (icon) { icon.hidden = embeddedSettings.showIcons === "no"; });
                  }
                }
                if (pageSection.type === "creator") {
                  const copy = embeddedSection.querySelector(".creator-copy");
                  const art = embeddedSection.querySelector(".creator-art");
                  const centered = embeddedSettings.layout === "centered";
                  embeddedSection.style.gridTemplateColumns = centered ? "minmax(0, 1fr)" : "";
                  if (copy) copy.style.textAlign = centered ? "center" : "";
                  if (art) { art.style.maxWidth = centered ? "320px" : ""; art.style.marginInline = centered ? "auto" : ""; }
                  embeddedSection.querySelectorAll(".creator-points").forEach(function (points) { points.style.justifyContent = centered ? "center" : ""; });
                }
                if (pageSection.type === "cta") {
                  const centered = embeddedSettings.layout === "centered";
                  embeddedSection.style.textAlign = centered ? "center" : "";
                  embeddedSection.querySelectorAll(":scope > div:last-child").forEach(function (actions) { actions.style.justifyContent = centered ? "center" : ""; });
                }
                embeddedContent.appendChild(embeddedSection);
                return;
              }

              const content = pageSection.content && typeof pageSection.content === "object" ? pageSection.content : {};
              const preview = document.createElement("section");
              preview.className = "vm-published-page-block vm-published-page-block-" + String(pageSection.type).replace(/[^a-z0-9-]/gi, "");
              preview.dataset.vmEmbeddedPageSection = pageSection.id || pageSection.type;
              preview.style.cssText = "box-sizing:border-box;min-width:0;padding:20px 0;border-top:1px solid var(--line,#333);";
              const previewTheme = pageSection.theme && typeof pageSection.theme === "object"
                ? pageSection.theme
                : (content.theme && typeof content.theme === "object" ? content.theme : {});
              const previewSettings = pageSection.settings && typeof pageSection.settings === "object"
                ? pageSection.settings
                : (content.settings && typeof content.settings === "object" ? content.settings : {});
              if (typeof previewTheme.bg === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.bg)) preview.style.backgroundColor = previewTheme.bg;
              if (typeof previewTheme.text === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.text)) preview.style.color = previewTheme.text;
              if (typeof previewTheme.accent === "string" && /^#[0-9a-f]{6}$/i.test(previewTheme.accent)) preview.style.setProperty("--accent", previewTheme.accent);
              if (previewTheme.width === "narrow") { preview.style.maxWidth = "900px"; preview.style.marginInline = "auto"; }
              else if (previewTheme.width === "wide") { preview.style.maxWidth = "none"; preview.style.marginInline = "0"; }
              else if (previewTheme.width === "standard") { preview.style.maxWidth = "1200px"; preview.style.marginInline = "auto"; }
              if (previewTheme.spacing === "compact") preview.style.paddingBlock = "12px";
              else if (previewTheme.spacing === "large") preview.style.paddingBlock = "48px";
              else if (previewTheme.spacing === "standard") preview.style.paddingBlock = "28px";
              const title = typeof content.title === "string" && content.title.trim() ? content.title.trim() : pageSection.label;
              if (title) {
                const heading = document.createElement("h2");
                heading.textContent = title;
                preview.appendChild(heading);
              }
              if (typeof content.subtitle === "string" && content.subtitle.trim()) {
                const description = document.createElement("p");
                description.textContent = content.subtitle.trim();
                description.style.lineHeight = "1.7";
                preview.appendChild(description);
              }
              if (typeof content.body === "string" && content.body.trim()) {
                const body = document.createElement("div");
                body.textContent = content.body.trim();
                body.style.cssText = "white-space:pre-line;line-height:1.8;overflow-wrap:anywhere;";
                preview.appendChild(body);
              }
              const imageUrl = typeof content.image === "string" ? content.image.trim() : "";
              if (imageUrl && (imageUrl.startsWith("https://") || imageUrl.startsWith("http://") || (imageUrl.startsWith("/") && !imageUrl.startsWith("//")))) {
                const image = document.createElement("img");
                image.src = imageUrl;
                image.alt = title || "";
                image.loading = "lazy";
                image.style.cssText = "display:block;max-width:100%;max-height:420px;object-fit:" + (previewTheme.imageFit === "contain" ? "contain" : "cover") + ";border-radius:" + (previewTheme.radius === "square" ? "0" : "12px") + ";margin:12px 0;";
                preview.appendChild(image);
              }
              if (Array.isArray(pageSection.items) && pageSection.items.length) {
                const list = document.createElement("div");
                const previewColumns = Number(previewSettings.columns);
                list.style.cssText = "display:grid;grid-template-columns:" + ([2, 3, 4, 5].includes(previewColumns) ? "repeat(" + previewColumns + ", minmax(0, 1fr))" : "repeat(auto-fit,minmax(180px,1fr))") + ";gap:12px;";
                pageSection.items.forEach(function (entry) {
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
                  list.appendChild(card);
                });
                preview.appendChild(list);
              }
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
          const layout = customContent.layout || "standard";
          customSection.style.cssText = "box-sizing:border-box;width:100%;padding:32px 5%;";
          const savedCustomTheme = customContent.theme && typeof customContent.theme === "object" ? customContent.theme : null;
          const customTheme = savedCustomTheme || (data.themes && data.themes[item.id]) || {};
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
            image.style.cssText = "display:block;max-width:100%;max-height:520px;object-fit:" + customImageFit + ";border-radius:" + (customTheme.radius === "square" ? "0" : "12px") + ";margin:16px auto;";
            customSection.appendChild(image);
          }
          if (item.type === "custom-gallery" || item.type === "custom-cards") {
            const grid = document.createElement("div");
            const columnCount = [2, 3, 4, 5].includes(Number(customContent.columns)) ? Number(customContent.columns) : 3;
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
              if (entry.image && (entry.image.startsWith("https://") || entry.image.startsWith("http://") || (entry.image.startsWith("/") && !entry.image.startsWith("//")))) {
                const image = document.createElement("img");
                image.src = entry.image;
                image.alt = "";
                image.loading = "lazy";
                image.style.cssText = "width:100%;aspect-ratio:16/9;object-fit:" + customImageFit + ";border-radius:" + (customTheme.radius === "square" ? "0" : "8px") + ";";
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
            button.style.cssText = "display:inline-flex;align-items:center;justify-content:center;margin-top:12px;padding:12px 20px;border-radius:" + (customTheme.radius === "square" ? "0" : "999px") + ";background:var(--accent,#d9b45f);color:" + customButtonText + ";text-decoration:none;font-weight:700;";
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
        const displaySettings = sectionContent.settings && typeof sectionContent.settings === "object" ? sectionContent.settings : {};
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
          section.style.textAlign = "";
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