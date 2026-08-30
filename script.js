// 热度：8 星制（1-8），缺省 4 星
const MAX_STARS = 8;
const DEFAULT_STARS = 4;

function clampStars(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return DEFAULT_STARS;
  return Math.min(MAX_STARS, Math.max(1, n));
}

// 圆润五角星 SVG。
// 之前用 Unicode 的 ★ / ☆，但字符字形是固定的、尖角很硬，没法调圆角；
// 换成 SVG 后一开始用 Material 的尖角路径靠 stroke 磨圆，尖角还是太锐。
// 现在这条路径是用「顶点切角」算法生成的：每个角沿两条边各退一段距离，
// 以原顶点为控制点画二次贝塞尔曲线，尖角就变成圆弧（外尖退 2.1、内凹退 1.45）。
// 只暴露这一个函数名：admin.js 与 script.js 共享全局作用域，少声明一个是一个。
function starIcon(filled) {
  const path =
    "M11.19 4.04 Q12 2.1 12.81 4.04 L14.06 7.06 Q14.62 8.4 16.06 8.51 L19.32 8.77 Q21.42 8.94 19.82 10.31 L17.33 12.43 Q16.23 13.38 16.57 14.79 L17.33 17.97 Q17.82 20.01 16.03 18.91 L13.24 17.21 Q12 16.45 10.76 17.21 L7.97 18.91 Q6.18 20.01 6.67 17.97 L7.43 14.79 Q7.77 13.38 6.67 12.43 L4.18 10.31 Q2.58 8.94 4.68 8.77 L7.94 8.51 Q9.38 8.4 9.94 7.06 L11.19 4.04 Z";
  return (
    `<svg class="star-icon${filled ? " is-on" : ""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">` +
    `<path d="${path}" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" ` +
    `stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />` +
    `</svg>`
  );
}

function starsMarkup(value) {
  const count = clampStars(value);
  let html = "";
  for (let index = 1; index <= MAX_STARS; index += 1) {
    html += starIcon(index <= count);
  }
  return `<span class="stars" aria-label="热度 ${count} 星（满分 ${MAX_STARS} 星）">${html}</span>`;
}

// 模板数据源：数据全部来自云端 /api/templates，代码里不再内置任何种子数据。
// 这样本地直接打开静态页时不会看到假数据，只会显示「加载中 / 加载失败」状态。
let templates = [];
let remoteError = "";
let isLoadingTemplates = true;

// —— 深色/浅色主题切换 ——
(function initTheme() {
  const STORAGE_KEY = "promptStudioTheme";
  const root = document.documentElement;
  const saved = localStorage.getItem(STORAGE_KEY);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isDark = saved ? saved === "dark" : prefersDark;

  if (isDark) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.removeAttribute("data-theme");
  }

  const toggleButton = document.querySelector("#themeToggle");
  const toggleIcon = toggleButton?.querySelector("span");

  function updateIcon() {
    if (!toggleIcon) return;
    toggleIcon.textContent = root.getAttribute("data-theme") === "dark" ? "☾" : "☀";
  }

  function toggleTheme() {
    if (root.getAttribute("data-theme") === "dark") {
      root.removeAttribute("data-theme");
      localStorage.setItem(STORAGE_KEY, "light");
    } else {
      root.setAttribute("data-theme", "dark");
      localStorage.setItem(STORAGE_KEY, "dark");
    }
    updateIcon();
  }

  updateIcon();
  toggleButton?.addEventListener("click", toggleTheme);
})();

if (document.body.dataset.page !== "admin") {
  const state = {
    selectedCategory: "生图",
    selectedTemplateId: "",
    query: "",
    sort: "popular",
    favorites: new Set(JSON.parse(localStorage.getItem("promptFavorites") || "[]")),
    values: {},
  };

  const categoryList = document.querySelector("#categoryList");
  const templateGrid = document.querySelector("#templateGrid");
  const searchInput = document.querySelector("#searchInput");
  const sortSelect = document.querySelector("#sortSelect");
  const editorTitle = document.querySelector("#editorTitle");
  const editorDescription = document.querySelector("#editorDescription");
  const variablesForm = document.querySelector("#variablesForm");
  const exampleGallery = document.querySelector("#exampleGallery");
  const exampleGalleryGrid = document.querySelector("#exampleGalleryGrid");
  const promptPreview = document.querySelector("#promptPreview");
  const copyButton = document.querySelector("#copyButton");
  const randomButton = document.querySelector("#randomButton");
  const resetVariables = document.querySelector("#resetVariables");
  const clearFilters = document.querySelector("#clearFilters");
  const favoriteButton = document.querySelector("#favoriteButton");
  const toast = document.querySelector("#toast");
  const emptyState = document.querySelector("#emptyState");
  const editorPanel = document.querySelector(".editor-panel");
  const templateCount = document.querySelector("#templateCount");
  const categoryCount = document.querySelector("#categoryCount");
  const heroCategory = document.querySelector("#heroCategory");
  const imageLightbox = document.querySelector("#imageLightbox");
  const lightboxImage = document.querySelector("#lightboxImage");
  const lightboxBackdrop = document.querySelector("#lightboxBackdrop");
  const lightboxClose = document.querySelector("#lightboxClose");

  const categories = ["生图", "文笔", "收藏"];
  const textareaKeys = ["草稿", "正文", "内容", "记录"];

  function getSelectedTemplate() {
    return templates.find((template) => template.id === state.selectedTemplateId);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getTemplateValues(template) {
    if (!state.values[template.id]) {
      state.values[template.id] = { ...(template.variables || {}) };
    }
    return state.values[template.id];
  }

  function renderCategories() {
    categoryList.innerHTML = "";
    categories.forEach((category) => {
      const count =
        category === "收藏"
          ? state.favorites.size
          : templates.filter((template) => template.category === category).length;

      const button = document.createElement("button");
      button.className = `category-button${state.selectedCategory === category ? " active" : ""}`;
      button.type = "button";
      button.dataset.category = category;
      button.innerHTML = `<span>${category}</span><span class="count">${count}</span>`;
      button?.addEventListener("click", () => {
        state.selectedCategory = category;
        const first = getVisibleTemplates()[0];
        state.selectedTemplateId = first?.id || "";
        render();
      });
      categoryList.appendChild(button);
    });
  }

  function getVisibleTemplates() {
    const query = state.query.trim().toLowerCase();
    const filtered = templates.filter((template) => {
      const matchesCategory =
        template.category === state.selectedCategory ||
        (state.selectedCategory === "收藏" && state.favorites.has(template.id));
      const haystack = [
        template.title,
        template.category,
        template.description,
        template.prompt,
        Object.values(template.variables || {}).join(" "),
      ]
        .join(" ")
        .toLowerCase();

      return matchesCategory && (!query || haystack.includes(query));
    });

    return filtered.sort((a, b) => {
      if (state.sort === "name") return a.title.localeCompare(b.title, "zh-CN");
      if (state.sort === "recent") return new Date(b.date) - new Date(a.date);
      // 推荐优先：星级高的在前，星级相同则按添加时间新的在前
      const diff = clampStars(b.popularity) - clampStars(a.popularity);
      if (diff !== 0) return diff;
      return new Date(b.date) - new Date(a.date);
    });
  }

  // 空状态现在要区分四种情况：加载中 / 接口失败 / 云端确实为空 / 搜索无结果
  function emptyStateMessage() {
    if (isLoadingTemplates) {
      return "<strong>正在从云端加载模板…</strong><span>首次打开需要一点时间。</span>";
    }
    if (remoteError) {
      return `<strong>云端数据加载失败</strong><span>${escapeHtml(remoteError)}。请确认已部署 Pages Functions，或稍后重试。</span>`;
    }
    if (templates.length === 0) {
      return "<strong>云端还没有任何模板</strong><span>去后台新增第一个模板吧。</span>";
    }
    return "<strong>没有找到匹配模板</strong><span>换个关键词，或者回到生图分类再试试。</span>";
  }

  function renderTemplates() {
    const visibleTemplates = getVisibleTemplates();
    templateGrid.innerHTML = "";

    if (visibleTemplates.length > 0) {
      emptyState.hidden = true;
    } else {
      emptyState.hidden = false;
      emptyState.innerHTML = emptyStateMessage();
    }

    visibleTemplates.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `template-card${template.id === state.selectedTemplateId ? " active" : ""}`;
      button.dataset.category = template.category;
      button.innerHTML = `
        <div class="card-topline">
          <span class="tag">${template.category}</span>
          <span class="favorite">${state.favorites.has(template.id) ? "♥" : "♡"}</span>
        </div>
        <h3>${escapeHtml(template.title)}</h3>
        <p>${escapeHtml(template.description)}</p>
        <div class="card-meta">
          ${starsMarkup(template.popularity)}
          <span>${Object.keys(template.variables || {}).length} 个关键词</span>
          <span>${(template.examples || []).length} 张例图</span>
        </div>
      `;
      button?.addEventListener("click", () => {
        state.selectedTemplateId = template.id;
        render();
        if (window.matchMedia("(max-width: 1180px)").matches) {
          editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      templateGrid.appendChild(button);
    });
  }

  // 收藏按钮状态：加 is-on 后爱心变红（样式见 .favorite-button.is-on）
  function setFavoriteState(isFavorite) {
    favoriteButton.classList.toggle("is-on", isFavorite);
    const heart = favoriteButton.querySelector(".heart");
    if (heart) heart.textContent = isFavorite ? "♥" : "♡";
  }

  // 点击特效：弹跳 + 扩散光圈。移除再强制重排，动画才能连续触发
  function playFavoriteBurst() {
    favoriteButton.classList.remove("is-animating");
    void favoriteButton.offsetWidth;
    favoriteButton.classList.add("is-animating");
  }

  function renderEditor() {
    const template = getSelectedTemplate();

    if (!template) {
      editorPanel.hidden = true;
      editorTitle.textContent = "选择一个模板";
      editorDescription.textContent = "从模板库选择一个提示词，这里会显示可修改的关键词、例图和实时预览。";
      setFavoriteState(false);
      copyButton.disabled = true;
      exampleGallery.hidden = true;
      exampleGalleryGrid.innerHTML = "";
      variablesForm.innerHTML = "";
      promptPreview.textContent = "等待选择模板...";
      return;
    }

    editorPanel.hidden = false;
    const values = getTemplateValues(template);

    editorTitle.textContent = template.title;
    editorDescription.textContent = template.description;
    setFavoriteState(state.favorites.has(template.id));
    copyButton.disabled = false;
    renderExampleGallery(template);

    variablesForm.innerHTML = "";
    Object.entries(template.variables || {}).forEach(([key, defaultValue]) => {
      const field = document.createElement("div");
      field.className = "field";
      const inputId = `field-${template.id}-${key}`;
      const useTextarea = textareaKeys.includes(key) || String(defaultValue).length > 34;

      field.innerHTML = `
        <label for="${inputId}">${escapeHtml(key)}</label>
        ${
          useTextarea
            ? `<textarea id="${inputId}" data-key="${escapeHtml(key)}">${escapeHtml(values[key] || "")}</textarea>`
            : `<input id="${inputId}" data-key="${escapeHtml(key)}" value="${escapeHtml(values[key] || "")}" />`
        }
      `;

      const control = field.querySelector("[data-key]");
      control?.addEventListener("input", (event) => {
        values[event.target.dataset.key] = event.target.value;
        updatePreview();
      });
      variablesForm.appendChild(field);
    });

    updatePreview();
  }

  function getTemplateExamples(template) {
    if (!Array.isArray(template.examples)) return [];
    return template.examples
      .map((example) => ({
        src: String(example.src || "").trim(),
      }))
      .filter((example) => example.src);
  }

  function renderExampleGallery(template) {
    const examples = getTemplateExamples(template);
    const isImageCategory = template.category === "生图";
    exampleGallery.hidden = !isImageCategory;

    if (!isImageCategory) {
      exampleGalleryGrid.innerHTML = "";
      return;
    }

    exampleGallery.dataset.empty = examples.length === 0 ? "true" : "false";
    if (examples.length === 0) {
      exampleGalleryGrid.innerHTML = `
        <div class="example-empty">
          <strong>${escapeHtml(template.title)}</strong>
          <span>暂未添加例图，可在后台补充图片路径。</span>
        </div>
      `;
      return;
    }

    exampleGalleryGrid.innerHTML = examples
      .map((example, index) => {
        const label = `${template.title}例图 ${index + 1}`;
        return `
          <button class="example-card" type="button" data-example-src="${escapeHtml(example.src)}" aria-label="查看${escapeHtml(label)}">
            <img src="${escapeHtml(example.src)}" alt="${escapeHtml(label)}" loading="lazy" />
          </button>
        `;
      })
      .join("");

    exampleGalleryGrid.querySelectorAll(".example-card").forEach((button) => {
      button?.addEventListener("click", () => openLightbox(button.dataset.exampleSrc));
    });
  }

  function openLightbox(src) {
    if (!src) return;
    lightboxImage.src = src;
    imageLightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxClose.focus();
  }

  function closeLightbox() {
    imageLightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    document.body.classList.remove("lightbox-open");
  }

  function buildPrompt(template = getSelectedTemplate()) {
    if (!template) return "";
    const values = getTemplateValues(template);
    return String(template.prompt || "").replace(/\{\{(.*?)\}\}/g, (_, key) => values[key.trim()] || "");
  }

  function updatePreview() {
    promptPreview.textContent = buildPrompt();
  }

  function normalizeSelectedTemplate() {
    const visibleTemplates = getVisibleTemplates();
    if (!getSelectedTemplate()) {
      state.selectedTemplateId = visibleTemplates[0]?.id || "";
    }
  }

  function render() {
    templateCount.textContent = templates.length;
    categoryCount.textContent = "2";
    heroCategory.textContent = state.selectedCategory === "收藏" ? "收藏" : state.selectedCategory;
    renderCategories();
    normalizeSelectedTemplate();
    renderTemplates();
    renderEditor();
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
  }

  async function copyPrompt() {
    const text = buildPrompt();
    try {
      await navigator.clipboard.writeText(text);
      showToast("已复制完整提示词。");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast("已复制提示词。");
    }
  }

  function saveFavorites() {
    localStorage.setItem("promptFavorites", JSON.stringify(Array.from(state.favorites)));
  }

  function toggleFavorite() {
    const template = getSelectedTemplate();
    if (!template) return;

    if (state.favorites.has(template.id)) {
      state.favorites.delete(template.id);
      showToast("已取消收藏。");
    } else {
      state.favorites.add(template.id);
      showToast("已加入收藏。");
    }
    saveFavorites();
    render();
    playFavoriteBurst();
  }

  function resetCurrentVariables() {
    const template = getSelectedTemplate();
    if (!template) return;

    state.values[template.id] = { ...(template.variables || {}) };
    renderEditor();
    showToast("已恢复默认关键词。");
  }

  function selectRandomTemplate() {
    const pool = getVisibleTemplates();
    const source = pool.length > 0 ? pool : templates;
    const next = source[Math.floor(Math.random() * source.length)];
    state.selectedTemplateId = next.id;
    state.selectedCategory = next.category;
    render();
    showToast(`已切换到「${next.title}」。`);
  }

  searchInput?.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTemplates();
  });

  sortSelect?.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderTemplates();
  });

  copyButton?.addEventListener("click", copyPrompt);
  randomButton?.addEventListener("click", selectRandomTemplate);
  resetVariables?.addEventListener("click", resetCurrentVariables);
  favoriteButton?.addEventListener("click", toggleFavorite);
  lightboxBackdrop?.addEventListener("click", closeLightbox);
  lightboxClose?.addEventListener("click", closeLightbox);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !imageLightbox.hidden) {
      closeLightbox();
    }
  });

  clearFilters?.addEventListener("click", () => {
    state.selectedCategory = "生图";
    state.query = "";
    state.sort = "popular";
    state.selectedTemplateId = "";
    state.favorites = new Set();
    saveFavorites();
    searchInput.value = "";
    sortSelect.value = "popular";
    render();
  });

  // 首屏先渲染空/加载态，再由云端数据覆盖
  render();
  loadRemoteTemplates();

  async function loadRemoteTemplates() {
    try {
      const res = await fetch("/api/templates", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        remoteError = `接口返回 HTTP ${res.status}`;
      } else {
        const data = await res.json();
        templates = Array.isArray(data) ? data : [];
      }
    } catch (error) {
      // 本地静态打开、或未部署 Pages Functions 时走这里：明确报错，不再渲染假数据
      remoteError = "无法连接云端接口 /api/templates";
    } finally {
      isLoadingTemplates = false;
      render();
    }
  }
}
