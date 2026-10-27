/* Site branding controls for the static UI demo. Actual site-wide persistence requires backend integration. */
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
    fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" })
      .then(function (response) { return response.ok ? response.json() : null; })
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
      const response = await fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
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
    let sections = [];
    const defaults = function () {
      return definitions.map(function (item, index) {
        return { id: item.type, type: item.type, label: item.label, hidden: false, order: index, content: {} };
      });
    };
    function normalize(items) {
      const source = Array.isArray(items) && items.length ? items : defaults();
      const seen = new Set();
      return source.filter(function (item) {
        if (!item || typeof item !== "object" || !definitions.some(function (def) { return def.type === item.type; })) return false;
        const id = typeof item.id === "string" && item.id ? item.id : item.type;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      }).map(function (item, index) {
        const def = definitions.find(function (entry) { return entry.type === item.type; });
        return Object.assign({}, item, { id: item.id || item.type, label: item.label || def.label, hidden: item.hidden === true, order: index, content: item.content && typeof item.content === "object" ? item.content : {} });
      });
    }
    function field(labelText, key, value, item, multiline) {
      const label = document.createElement("label");
      label.style.cssText = "display:grid;gap:5px;min-width:0;font-size:12px;";
      label.appendChild(document.createTextNode(labelText));
      const input = document.createElement(multiline ? "textarea" : "input");
      if (!multiline) input.type = "text";
      if (multiline) input.rows = 2;
      input.value = value || "";
      input.style.cssText = "box-sizing:border-box;width:100%;padding:8px;border:1px solid #424650;border-radius:6px;background:#111318;color:inherit;font:inherit;";
      input.addEventListener("input", function () { item.content[key] = input.value; });
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
        }
        button("↑", index === 0, function () { [sections[index - 1], sections[index]] = [sections[index], sections[index - 1]]; render(); });
        button("↓", index === sections.length - 1, function () { [sections[index + 1], sections[index]] = [sections[index], sections[index + 1]]; render(); });
        button(item.hidden ? "表示する" : "非表示にする", false, function () { item.hidden = !item.hidden; render(); });
        button("削除", item.added !== true, function () { sections = sections.filter(function (section) { return section.id !== item.id; }); render(); });
        head.appendChild(actions);
        row.appendChild(head);
        const fields = document.createElement("div");
        fields.style.cssText = "display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;";
        fields.append(
          field("見出し", "title", item.content.title, item, false),
          field("説明", "subtitle", item.content.subtitle, item, true),
          field("ボタン表示", "button", item.content.button, item, false),
          field("リンク先", "link", item.content.link, item, false),
          field("画像URL", "image", item.content.image, item, false)
        );
        row.appendChild(fields);
        root.appendChild(row);
      });
    }
    async function load() {
      status.textContent = "サーバーからTOP設定を読み込んでいます…";
      try {
        const response = await fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" });
        if (!response.ok) throw new Error("load_failed");
        const data = await response.json();
        sections = normalize(data.sections);
        render();
        status.textContent = "TOP設定を読み込みました。";
      } catch (_) {
        sections = normalize([]);
        render();
        status.textContent = "サーバーから読み込めませんでした。運営者ログイン状態を確認してください。";
      }
    }
    const add = document.getElementById("top-add-section");
    if (add) add.addEventListener("click", function () {
      const def = definitions.find(function (item) { return item.type === select.value; });
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


  async function syncHomepageSections() {
    if (!document.querySelector("main") || !document.querySelector(".hero")) return;
    try {
      const response = await fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      const sections = Array.isArray(data.sections) ? data.sections : [];
      const pageSettings = data.pageSettings || {};
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
      const chrome = pageSettings.chrome || {};
      if (typeof chrome.menuOrder === "string") {
        const nav = document.querySelector(".nav-right nav");
        if (nav) chrome.menuOrder.split(",").forEach(function (name) {
          const link = nav.querySelector('[data-site-nav="' + name + '"]');
          if (link) nav.appendChild(link);
        });
      }
      if (chrome.footerShowLinks === "hide") {
        const footerLinks = document.querySelector(".footer-cols");
        if (footerLinks) footerLinks.hidden = true;
      }
      if (chrome.footerCopyright) {
        const copyright = document.getElementById("site-footer-copyright");
        if (copyright) copyright.textContent = String(chrome.footerCopyright);
      }
      if (chrome.footerDescription) {
        const footerDescription = document.getElementById("site-footer-description");
        if (footerDescription) footerDescription.textContent = String(chrome.footerDescription);
      }
      if (chrome.showPurchase === false) document.querySelectorAll('header a[href*="library"], header a[href*="video-list"]').forEach(el => { el.hidden = true; });
      if (chrome.showSell === false) document.querySelectorAll('header a[href*="seller"], header a[href*="creator"]').forEach(el => { el.hidden = true; });
      if (chrome.showAccount === false) document.querySelectorAll('header a[href*="login"], header a[href*="account"]').forEach(el => { el.hidden = true; });
      if (chrome.showCart === false) document.querySelectorAll('header a[href*="cart"]').forEach(el => { el.hidden = true; });
      main.querySelectorAll("[data-vm-section-id][data-vm-section-type]").forEach(function (element) {
        if (element.dataset.vmSectionId !== element.dataset.vmSectionType) element.remove();
        else element.hidden = false;
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
        section.hidden = item.hidden === true;
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
      if (Array.isArray(data.publishedPages) && data.publishedPages.length) {
        const publishedSection = document.createElement("section");
        publishedSection.className = "section vm-published-pages";
        publishedSection.id = "published-pages";
        publishedSection.dataset.vmSectionType = "published-pages";
        publishedSection.dataset.vmSectionId = "published-pages";
        const heading = document.createElement("h2");
        heading.textContent = "公開ページ";
        const links = document.createElement("div");
        links.className = "vm-published-page-links";
        data.publishedPages.forEach(function (page) {
          if (!page || typeof page.name !== "string" || typeof page.url !== "string" ||
              !/^\/(?!\/)[a-zA-Z0-9._/-]*$/.test(page.url) || page.url.split("/").includes("..")) return;
          const link = document.createElement("a");
          link.href = page.url;
          link.textContent = page.name;
          links.appendChild(link);
        });
        if (links.children.length) {
          publishedSection.append(heading, links);
          main.appendChild(publishedSection);
        }
      }
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyBranding(document.getElementById("settings-form") ? readSettings() : {});
    installSettingsForm();
    installTopSettingsEditor();
    installSessionNavigation();
    syncHomepageSections();
    syncPublicSettings();
  });
})();