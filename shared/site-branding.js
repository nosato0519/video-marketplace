/* Site branding controls for the static UI demo. Actual site-wide persistence requires backend integration. */
(function () {
  "use strict";

  const STORAGE_KEY = "vm-demo-site-branding";
  const originalTitle = document.title;
  const MAX_LOGO_BYTES = 2 * 1024 * 1024;
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
        status.textContent = "PNG・JPEG・WebP・SVG、2MB以下の画像を選択してください。";
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        applyBranding(settings);
        renderPreview();
        status.textContent = "保存しました。このブラウザ内のデモ表示に反映されています。";
      } catch (_) {
        status.textContent = "保存できませんでした。画像サイズを小さくしてお試しください。";
      }
    });

    reset.addEventListener("click", function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      logoDataUrl = "";
      nameInput.value = initialName;
      fileInput.value = "";
      applyBranding({ siteName: initialName, logoDataUrl: "" });
      renderPreview();
      status.textContent = "初期表示に戻しました。";
    });

    const saved = readSettings();
    if (saved.siteName) nameInput.value = saved.siteName;
    logoDataUrl = saved.logoDataUrl || "";
    renderPreview();
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
    // The admin editor owns loading and saving homepage sections. Avoid a second
    // asynchronous sync here, which can overwrite editor state or reload mid-save.
    if (document.getElementById("landing-section-list")) return;

    if (!document.querySelector("main") || !document.querySelector(".hero")) return;
    try {
      const response = await fetch("/api/site/homepage-settings", { credentials: "same-origin", cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!Array.isArray(data.sections)) return;
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
      data.sections.forEach(function (item) {
        if (!item || typeof item !== "object") return;
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
      ordered.forEach(function (section) { main.appendChild(section); });
    } catch (_) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    applyBranding(readSettings());
    installSettingsForm();
    installSessionNavigation();
    syncHomepageSections();
  });
})();