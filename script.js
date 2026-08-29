const defaultTemplates = [
  {
    "id": "template-mq3l8bmm-4578a",
    "title": "半条命画风",
    "category": "生图",
    "description": "",
    "popularity": 78,
    "date": "2026-06-07",
    "variables": {},
    "examples": [
      {
        "src": "./assets/examples/5/1.png",
        "title": "",
        "description": ""
      },
      {
        "src": "./assets/examples/5/2.png",
        "title": "",
        "description": ""
      }
    ],
    "prompt": "严格基于参考图进行风格转换，100%锁定原图构图、人物与场景，禁止任何重绘与元素篡改。Garry's Mod (GMOD) Source引擎渲染，半条命2模组场景，2000年代千禧年早期3D游戏画质。低多边形块状建模，低分辨率粗糙贴图，老旧游戏颗粒感，复古忧郁氛围。模拟早期引擎生硬光影，阴天漫射无硬阴影，整体昏暗冷灰低饱和色调，阴沉多云天空。中近景人物取景，保持原图视角不变。"
  },
  {
    "id": "template-mq38rwaq-kc924",
    "title": "人物拖影",
    "category": "生图",
    "description": "电影级视觉设计的生成。",
    "popularity": 80,
    "date": "2026-06-07",
    "variables": {
      "图片左下角文字": "lam the protagonist of my life script"
    },
    "examples": [
      {
        "src": "./assets/examples/4.png",
        "title": "",
        "description": ""
      }
    ],
    "prompt": "参照我的图，帮我把这张照片处理出动感横向拖影效果，拖影范围不要太大，拖影颜色和人物本身颜色严格统一。\n采用伦勃朗光影布光，仅一束强光打亮半张脸，面部其余区域处于深邃阴影中；整体暗调风格，光影对比强烈。\n人物处于右侧，身后左侧添加横向动态模糊拖影，营造速度感和压迫感，整体风格硬朗帅气，营造疾速行进的速度感。\n纯黑色背景，色调保持低对比，高质感的电影感。8K分辨率，细节丰富。\n左下角排版白色简约字体文字：{{图片左下角文字}}。\n画幅比例3:2，写实原生摄影风格。"
  },
  {
    "id": "template-mpzbh0et-7r2jz",
    "title": "物品描边",
    "category": "生图",
    "description": "把日常拍摄的照片变得有趣。",
    "popularity": 80,
    "date": "2026-06-04",
    "variables": {},
    "examples": [
      {
        "src": "./assets/examples/1.png",
        "title": "",
        "description": ""
      }
    ],
    "prompt": "请观察照片中的元素，并为每个物件加上有意义的手绘风注解。请填写照片中的物品（例：披萨、汽水）\n\n描写规则：\n1.使用像白色笔画的细线手绘线条\n2.一笔画风格、随性、略带不均匀感\n3.沿着物件外围加上描边轮廓\n4.用箭头或虛线做出视线引导\n文字规则：\n1.手写风格字体（日系可爱感）\n2.句子简短、像自言自语的小碎念\n3.语气偏日记感、带一点情绪\n注解生成规则：\n1.饮料 一> 味道、温度、心情 （例： 清爽、微甜、 刚刚好）\n2.食物 一> 口感、好吃程度 （例： 松软、超好吃）\n3.空间 一> 氛围（例：很放松、喜欢这种感觉）\n4.整体 一> 一句总结（例：今天有点幸福~）\n装饰：\n1.适度加入热气、闪光、爱心、星星、小表情等元素。\n2.不要过度装饰，保留空白空间。"
  },
  {
    "id": "image-cinematic-product",
    "title": "发型分析信息图",
    "category": "生图",
    "description": "使用一张或多张自拍照片制作一份发型分析图表。",
    "popularity": 96,
    "date": "2026-06-01",
    "variables": {},
    "examples": [
      {
        "src": "./assets/examples/3.png",
        "title": "",
        "description": ""
      }
    ],
    "prompt": "create a hair analysis graphic using this portrait.\nAnalyze and present:\nFace shape (e.g., oval, round, square, heart)\nHair texture (straight, wavy, curly)\nHair density (thin, medium, thick)\nHairline and forehead proportion\nOverall vibe and style suitability\nShow visual comparisons of:\nRecommended hairstyles vs Not recommended styles\nShort / Medium / Long length options\nDifferent fringe styles (no fringe, curtain bangs, side part, etc.)\nInclude sections:\nBEST HAIRSTYLES\nNOT RECOMMENDED\nHAIR LENGTH\nPARTING & FRINGE\nHAIR COLOR\nHair color analysis:\nWarm / Cool / Neutral tones\nShow color swatches and real examples on the portrait\nDesign style:\nClean, modern, visual-first\nSide-by-side comparisons using the same portrait\nMinimal text, short labels only (no paragraphs)\nLanguage:\nInclude both English and Chinese labels for all sections and elements\nOptional:\nAdd a final summary section: \"Overall Look / Appearance\"\nVertical 3:2"
  },
  {
    "id": "image-editorial-portrait",
    "title": "企业高管证件照片",
    "category": "生图",
    "description": "生成一张商务高管的证件照/形象照。",
    "popularity": 93,
    "date": "2026-05-29",
    "variables": {
      "姓名": "Elon Musk",
      "学历": "University of Pennsylvania",
      "专业": "Engineer"
    },
    "examples": [
      {
        "src": "./assets/examples/0.png",
        "title": "",
        "description": ""
      }
    ],
    "prompt": "Generate a business executive headshot with identical layout, style, and typography to the reference image (Image 1):\n1. Subject: Based on the provided photo of the user, create a professional portrait of an East Asian male. Refine facial contours, smooth skin texture, and style a business hairstyle that complements the subject’s face shape. He is wearing a dark navy blue suit, a crisp white dress shirt, and a deep purple tie, set against a plain pure white background.\n2. Bottom Text Layout (1:1 replication of the reference format): • A solid white banner area at the bottom of the image, with all text contained within its boundaries. • Line 1: Left-aligned blue text reading \"{{姓名}}\", matching the font, font size, and color of the word \"Customer\" in the reference image exactly. • Line 2: Left-aligned black text directly below Line 1, reading \"{{学历}}\", matching the font, font size, and color of the same text in the reference image exactly. • Line 3: Left-aligned black text directly below Line 2, reading \"{{专业}}\", matching the font, font size, and color of the phrase \"Software Engineering\" in the reference image exactly.\n3. Overall Style: Maintain the clean, professional corporate executive portrait aesthetic from the reference image, with even, soft lighting and high-resolution, sharp quality.\n4. Text must follow the reference's alignment, spacing, and hierarchy exactly—no misalignment, no overflow, no changes to font proportions."
  },
  {
    "id": "writing-soft-launch",
    "title": "品牌发布文案",
    "category": "文笔",
    "description": "把产品或服务写成有画面、有节奏、适合发布的品牌文案。",
    "popularity": 94,
    "date": "2026-05-25",
    "variables": {
      "品牌": "一家独立香氛工作室",
      "受众": "审美成熟的年轻消费者",
      "语气": "克制、温柔、富有画面感",
      "渠道": "小红书首发"
    },
    "examples": [],
    "prompt": "请为「{{品牌}}」写一组适合「{{渠道}}」发布的品牌文案，面向「{{受众}}」。语气保持「{{语气}}」，包含标题、短引言、三段正文和一句收束语。"
  },
  {
    "id": "writing-polish-prose",
    "title": "段落润色成稿",
    "category": "文笔",
    "description": "把粗糙草稿改成更自然、更有节奏的中文表达。",
    "popularity": 91,
    "date": "2026-05-21",
    "variables": {
      "草稿": "在这里粘贴需要润色的文字",
      "风格": "自然、细腻、不堆砌",
      "保留": "原意和关键信息"
    },
    "examples": [],
    "prompt": "请润色以下草稿，风格为「{{风格}}」，需要保留「{{保留}}」。输出润色后的正文，并简短说明三处关键修改。\n\n草稿：\n{{草稿}}"
  }
];

// 模板数据源：先用内置兜底，前台 fetch 到云端数据后再覆盖（见文件末尾的加载逻辑）
let templates = defaultTemplates;
window.PROMPT_DEFAULT_TEMPLATES = defaultTemplates;

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
      button.addEventListener("click", () => {
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
      return b.popularity - a.popularity;
    });
  }

  function renderTemplates() {
    const visibleTemplates = getVisibleTemplates();
    templateGrid.innerHTML = "";
    emptyState.hidden = visibleTemplates.length > 0;

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
          <span>${Object.keys(template.variables || {}).length} 个关键词</span>
          <span>${(template.examples || []).length} 张例图</span>
        </div>
      `;
      button.addEventListener("click", () => {
        state.selectedTemplateId = template.id;
        render();
        if (window.matchMedia("(max-width: 1180px)").matches) {
          editorPanel.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
      templateGrid.appendChild(button);
    });
  }

  function renderEditor() {
    const template = getSelectedTemplate();

    if (!template) {
      editorPanel.hidden = true;
      editorTitle.textContent = "选择一个模板";
      editorDescription.textContent = "从模板库选择一个提示词，这里会显示可修改的关键词、例图和实时预览。";
      favoriteButton.innerHTML = `<span aria-hidden="true">♡</span>`;
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
    favoriteButton.innerHTML = `<span aria-hidden="true">${state.favorites.has(template.id) ? "♥" : "♡"}</span>`;
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
      control.addEventListener("input", (event) => {
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
      button.addEventListener("click", () => openLightbox(button.dataset.exampleSrc));
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

  searchInput.addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTemplates();
  });

  sortSelect.addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderTemplates();
  });

  copyButton.addEventListener("click", copyPrompt);
  randomButton.addEventListener("click", selectRandomTemplate);
  resetVariables.addEventListener("click", resetCurrentVariables);
  favoriteButton.addEventListener("click", toggleFavorite);
  lightboxBackdrop.addEventListener("click", closeLightbox);
  lightboxClose.addEventListener("click", closeLightbox);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !imageLightbox.hidden) {
      closeLightbox();
    }
  });

  clearFilters.addEventListener("click", () => {
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

  // 首屏用内置兜底渲染，再异步拉云端数据覆盖（失败则保持兜底）
  render();
  loadRemoteTemplates();

  async function loadRemoteTemplates() {
    try {
      const res = await fetch("/api/templates", {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        templates = data;
        render();
      }
    } catch {
      /* 接口不可用（本地/未部署）时保持内置兜底 */
    }
  }
}
