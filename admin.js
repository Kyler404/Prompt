const LEGACY_STORAGE_KEY = "promptTemplates";
const ALLOWED_CATEGORIES = ["生图", "文笔"];

const adminState = {
  templates: structuredClone(window.PROMPT_DEFAULT_TEMPLATES || []),
  selectedId: "",
  query: "",
  dirty: false,
  expandedCategories: new Set(ALLOWED_CATEGORIES),
  dirtyTemplates: new Set(),
  // 上次成功加载/保存时的例图 URL 集合。
  // 保存成功后与当前集合做差集，差出来的就是可以安全删除的孤儿文件。
  baselineSrcs: new Set(),
};

// 只有落在我们自己的图片域名下的 URL 才允许被删除，避免误删外链图
const IMAGE_BASE = "https://img.guoke404.xin/";

// 简短说明的提示文案：只作 placeholder，不作为真实内容存进数据
const DESCRIPTION_PLACEHOLDER = "在这里填写这个模板适合什么场景。";

function normalizeDescription(value) {
  const text = String(value || "").trim();
  return text === DESCRIPTION_PLACEHOLDER ? "" : text;
}

// 模板短码：由模板 id 派生的固定标识（取 id 末尾 6 位字母数字）。
// 与模板在列表中的位置无关，增删、排序、改名都不会变，
// 所以例图文件名不会跟着漂移，更不会撞上别的模板正在用的文件。
function templateSlug(template) {
  const raw = String((template && template.id) || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (raw.length >= 6) return raw.slice(-6);
  if (raw) return raw;

  // 极端兜底（没有 id）：用标题生成稳定短码，保证同一模板每次结果一致
  const seed = String((template && template.title) || "template");
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 33 + seed.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36).padStart(6, "0").slice(-6);
}

// 热度：8 星制（1-8），缺省 4 星
const STAR_MAX = 8;
const STAR_DEFAULT = 4;

function clampStarValue(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return STAR_DEFAULT;
  return Math.min(STAR_MAX, Math.max(1, n));
}

function renderStarPicker(value) {
  if (!popularityStars) return;
  const current = clampStarValue(value);
  popularityStars.innerHTML = "";
  for (let index = 1; index <= STAR_MAX; index += 1) {
    const star = document.createElement("button");
    star.type = "button";
    star.className = index <= current ? "star is-on" : "star";
    star.textContent = index <= current ? "★" : "☆";
    star.dataset.value = String(index);
    star.setAttribute("aria-label", `${index} 星`);
    star.setAttribute("aria-pressed", index <= current ? "true" : "false");
    star.addEventListener("click", () => {
      popularityInput.value = String(index);
      renderStarPicker(index);
      syncFormToState();
      markDirty(adminState.selectedId);
    });
    popularityStars.appendChild(star);
  }
}

function collectExampleSources() {
  const set = new Set();
  adminState.templates.forEach((template) => {
    (Array.isArray(template.examples) ? template.examples : []).forEach((example) => {
      if (example && example.src) set.add(example.src);
    });
  });
  return set;
}

function findOrphanImages() {
  const current = collectExampleSources();
  return [...adminState.baselineSrcs].filter(
    (src) => !current.has(src) && String(src).startsWith(IMAGE_BASE),
  );
}

async function deleteOrphanImages(urls) {
  try {
    const res = await fetch("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) return { deleted: [], failed: urls.map((url) => ({ url })) };
    const data = await res.json();
    return {
      deleted: Array.isArray(data.deleted) ? data.deleted : [],
      failed: Array.isArray(data.failed) ? data.failed : [],
    };
  } catch (error) {
    return { deleted: [], failed: urls.map((url) => ({ url, error: error.message })) };
  }
}

const adminTemplateList = document.querySelector("#adminTemplateList");
const adminSearch = document.querySelector("#adminSearch");
const adminEditorPanel = document.querySelector(".admin-editor-panel");
const adminEditorTitle = document.querySelector("#adminEditorTitle");
const adminForm = document.querySelector("#adminForm");
const titleInput = document.querySelector("#titleInput");
const categoryInput = document.querySelector("#categoryInput");
const popularityInput = document.querySelector("#popularityInput");
const popularityStars = document.querySelector("#popularityStars");
const dateInput = document.querySelector("#dateInput");
const descriptionInput = document.querySelector("#descriptionInput");
const promptInput = document.querySelector("#promptInput");
const exampleRows = document.querySelector("#exampleRows");
const variableRows = document.querySelector("#variableRows");
const newTemplateButton = document.querySelector("#newTemplateButton");
const duplicateButton = document.querySelector("#duplicateButton");
const deleteButton = document.querySelector("#deleteButton");
const uploadExampleButton = document.querySelector("#uploadExampleButton");
const addVariableButton = document.querySelector("#addVariableButton");
const saveAllButton = document.querySelector("#saveAllButton");
const restoreDefaultsButton = document.querySelector("#restoreDefaultsButton");
const saveStatus = document.querySelector("#saveStatus");
const toastAdmin = document.querySelector("#toast");

async function loadAdminTemplates() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
  }

  // 先用内置数据兜底
  adminState.templates = structuredClone(window.PROMPT_DEFAULT_TEMPLATES || []);
  adminState.selectedId = adminState.templates[0]?.id || "";

  // 再拉云端数据（有则覆盖，空/失败则保持兜底）
  try {
    const res = await fetch("/api/templates", {
      headers: { Accept: "application/json" },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        adminState.templates = data;
        adminState.selectedId = data[0]?.id || "";
      }
    }
  } catch {
    /* 接口不可用（本地/未部署）时保持内置兜底 */
  }

  // 记录基线：这是云端（或兜底数据）当前引用的例图，之后保存时用来算孤儿
  adminState.baselineSrcs = collectExampleSources();
}

async function initializeAdmin() {
  await loadAdminTemplates();
  render();
}

function getSelectedTemplate() {
  return adminState.templates.find((template) => template.id === adminState.selectedId);
}

function markDirty(templateId) {
  adminState.dirty = true;
  if (templateId) {
    adminState.dirtyTemplates.add(templateId);
  }
  saveStatus.textContent = "有未保存的修改。点「保存到云端」后前台生效。";
}

function showToast(message) {
  toastAdmin.textContent = message;
  toastAdmin.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toastAdmin.classList.remove("show"), 2200);
}

function uid(prefix = "template") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeCategory(category) {
  return ALLOWED_CATEGORIES.includes(category) ? category : "文笔";
}

function getFilteredTemplates() {
  const query = adminState.query.trim().toLowerCase();
  if (!query) return adminState.templates;

  return adminState.templates.filter((template) =>
    [template.title, template.category, template.description, template.prompt]
      .join(" ")
      .toLowerCase()
      .includes(query),
  );
}

function renderTemplateList() {
  const filtered = getFilteredTemplates();
  adminTemplateList.innerHTML = "";

  if (filtered.length === 0) {
    adminTemplateList.innerHTML = `
      <div class="admin-empty">
        <strong>没有匹配模板</strong>
        <span>换个关键词，或在右侧 Template Detail 中新增模板。</span>
      </div>
    `;
    return;
  }

  const grouped = filtered.reduce((acc, template) => {
    const category = template.category || "未分类";
    if (!acc.order.includes(category)) acc.order.push(category);
    acc.groups[category] = acc.groups[category] || [];
    acc.groups[category].push(template);
    return acc;
  }, { order: [], groups: {} });

  // 分组内排序：星级高的在前，星级相同按添加时间新的在前（与前台「推荐优先」保持一致）
  Object.values(grouped.groups).forEach((list) => {
    list.sort((a, b) => {
      const diff = clampStarValue(b.popularity) - clampStarValue(a.popularity);
      if (diff !== 0) return diff;
      return new Date(b.date) - new Date(a.date);
    });
  });

  // 初次加载时不默认展开任何分类

  grouped.order.forEach((category) => {
    const categoryTemplates = grouped.groups[category];
    const expanded = adminState.expandedCategories.has(category);

    const section = document.createElement("div");
    section.className = "admin-template-category";
    section.dataset.category = category;

    const header = document.createElement("button");
    header.type = "button";
    header.className = "admin-category-header";
    header.innerHTML = `
      <span>${category}</span>
      <span>${categoryTemplates.length} 个</span>
      <span class="category-indicator">${expanded ? "▾" : "▸"}</span>
    `;
    header.addEventListener("click", () => {
      if (adminState.expandedCategories.has(category)) {
        adminState.expandedCategories.delete(category);
      } else {
        adminState.expandedCategories.add(category);
      }
      renderTemplateList();
    });

    section.appendChild(header);

    const list = document.createElement("div");
    list.className = "admin-category-list";
    if (!expanded) list.hidden = true;

    categoryTemplates.forEach((template) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `admin-template-item${template.id === adminState.selectedId ? " active" : ""}`;
      button.innerHTML = `
        <strong>
          ${template.title}
          ${adminState.dirtyTemplates.has(template.id) ? '<span class="template-badge">已修改</span>' : ''}
        </strong>
        <span>${template.category} · ${Object.keys(template.variables || []).length} 个变量 · ${(template.examples || []).length} 张例图</span>
      `;
      button.addEventListener("click", () => {
        syncFormToState();
        adminState.selectedId = template.id;
        render();
      });
      list.appendChild(button);
    });

    section.appendChild(list);
    adminTemplateList.appendChild(section);
  });
}

function createVariableRow(key = "", value = "") {
  const row = document.createElement("div");
  row.className = "variable-row";
  row.innerHTML = `
    <input class="variable-key" placeholder="变量名，如：主题" value="${escapeAttribute(key)}" />
    <input class="variable-value" placeholder="默认值" value="${escapeAttribute(value)}" />
    <button class="icon-button variable-remove" type="button" aria-label="删除变量">×</button>
  `;
  row.querySelector(".variable-remove").addEventListener("click", () => {
    row.remove();
    syncFormToState();
    markDirty(adminState.selectedId);
  });
  row.querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", () => {
      syncFormToState();
      markDirty(adminState.selectedId);
    });
  });
  return row;
}

function createExampleRow(example = {}) {
  const row = document.createElement("div");
  row.className = "example-row";
  row.dataset.src = example.src || "";
  row.innerHTML = `
    <img class="example-thumb" src="${escapeAttribute(example.src || "")}" alt="例图预览" loading="lazy" />
    <button class="example-remove" type="button" aria-label="删除例图">×</button>
  `;
  row.querySelector(".example-remove").addEventListener("click", () => {
    row.remove();
    syncFormToState();
    markDirty(adminState.selectedId);
  });
  return row;
}

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderEditor() {
  const template = getSelectedTemplate();

  if (!template) {
    adminEditorPanel.hidden = false;
    adminForm.hidden = true;
    duplicateButton.disabled = true;
    deleteButton.disabled = true;
    newTemplateButton.disabled = false;
    adminEditorTitle.textContent = "模板详情";
    return;
  }

  adminEditorPanel.hidden = false;
  adminForm.hidden = false;
  newTemplateButton.disabled = false;
  duplicateButton.disabled = false;
  deleteButton.disabled = false;
  adminEditorTitle.textContent = template.title;

  titleInput.value = template.title || "";
  categoryInput.value = template.category || "";
  popularityInput.value = String(clampStarValue(template.popularity));
  renderStarPicker(clampStarValue(template.popularity));
  dateInput.value = template.date || today();
  descriptionInput.value = normalizeDescription(template.description);
  promptInput.value = template.prompt || "";

  exampleRows.innerHTML = "";
  (Array.isArray(template.examples) ? template.examples : []).forEach((example) => {
    exampleRows.appendChild(createExampleRow(example));
  });

  variableRows.innerHTML = "";
  Object.entries(template.variables || {}).forEach(([key, value]) => {
    variableRows.appendChild(createVariableRow(key, value));
  });
}

function syncFormToState() {
  const template = getSelectedTemplate();
  if (!template || adminForm.hidden) return;

  template.title = titleInput.value.trim();
  template.category = categoryInput.value.trim();
  template.popularity = clampStarValue(popularityInput.value);
  template.date = dateInput.value || today();
  template.description = normalizeDescription(descriptionInput.value);
  template.prompt = promptInput.value.trim();
  template.examples = [];
  template.variables = {};

  exampleRows.querySelectorAll(".example-row").forEach((row) => {
    const src = (row.dataset.src || "").trim();
    if (src) template.examples.push({ src });
  });

  variableRows.querySelectorAll(".variable-row").forEach((row) => {
    const key = row.querySelector(".variable-key").value.trim();
    const value = row.querySelector(".variable-value").value.trim();
    if (key) template.variables[key] = value;
  });
}

function render() {
  renderTemplateList();
  renderEditor();
}

function createTemplate() {
  syncFormToState();
  const category = normalizeCategory(categoryInput.value || getSelectedTemplate()?.category || "文笔");
  const next = {
    id: uid(),
    title: "新的提示词模板",
    category,
    description: "",
    popularity: STAR_DEFAULT,
    date: today(),
    variables: {
      主题: "你的主题",
      语气: "清晰、专业",
    },
    examples: [],
    prompt: "请围绕「{{主题}}」，用「{{语气}}」的语气生成一份内容。",
  };
  adminState.templates.unshift(next);
  adminState.expandedCategories.add(next.category);
  adminState.selectedId = next.id;
  markDirty(adminState.selectedId);
  render();
}

function duplicateTemplate() {
  syncFormToState();
  const template = getSelectedTemplate();
  if (!template) return;

  const clone = structuredClone(template);
  clone.id = uid("copy");
  clone.title = `${template.title} 副本`;
  clone.date = today();
  const index = adminState.templates.findIndex((item) => item.id === template.id);
  adminState.templates.splice(index + 1, 0, clone);
  adminState.selectedId = clone.id;
  markDirty(adminState.selectedId);
  render();
}

function deleteTemplate() {
  const template = getSelectedTemplate();
  if (!template) return;

  const confirmed = window.confirm(`确定删除「${template.title}」吗？保存后前台也会删除。`);
  if (!confirmed) return;

  const index = adminState.templates.findIndex((item) => item.id === template.id);
  adminState.templates.splice(index, 1);
  adminState.selectedId = adminState.templates[Math.max(0, index - 1)]?.id || "";
  markDirty();
  render();
}

function addVariable() {
  variableRows.appendChild(createVariableRow("", ""));
  markDirty(adminState.selectedId);
}

// —— 上传例图到 R2 ——
// 命名规则（服务端统一生成，前端只传短码 + 序号，唯一令牌由服务端加）：
//   t{模板短码}-{例图序号}-{唯一令牌}.{扩展名}
//   模板短码 = 由模板 id 派生的固定短码，与模板在列表中的位置无关。
//              早期用「列表位置」当序号，新增模板插到最前会让所有位置下移，
//              新模板就会复用到别的模板正在用的文件名，把对方的图直接覆盖掉。
//   例图序号 = 该模板下第几张例图（1 起）
//   唯一令牌 = 服务端生成，保证每次上传都是新地址、永不覆盖同名对象。
// 例：短码 m4578a 的第 2 张 → tm4578a-2-m9x2k1p0z3.webp
//
// 因为一个地址的内容永不变，浏览器和 CDN 都能强缓存（immutable），
// 不会再出现「换了图还看到旧的」。替换图片 = 新增文件，旧文件由保存时的差集清理回收。
const uploadInput = document.createElement("input");
uploadInput.type = "file";
uploadInput.accept = "image/*";
uploadInput.multiple = true;
uploadInput.hidden = true;
document.body.appendChild(uploadInput);

function uploadExample() {
  uploadInput.click();
}

uploadInput?.addEventListener("change", async () => {
  const files = Array.from(uploadInput.files || []);
  uploadInput.value = "";
  if (!files.length) return;

  const template = getSelectedTemplate();
  if (!template) {
    showToast("请先选择一个模板。");
    return;
  }

  const slug = templateSlug(template);
  let exampleIndex = exampleRows.querySelectorAll(".example-row").length;
  let uploaded = 0;

  for (const file of files) {
    exampleIndex += 1;
    showToast(`上传中…（第 ${exampleIndex} 张）`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("slug", slug);
      fd.append("exampleIndex", String(exampleIndex));
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const err = await res.json();
          if (err && err.error) message = err.error;
        } catch {
        }
        throw new Error(message);
      }
      const data = await res.json();
      exampleRows.appendChild(createExampleRow({ src: data.url }));
      syncFormToState();
      markDirty(adminState.selectedId);
      uploaded += 1;
    } catch (error) {
      showToast(`第 ${exampleIndex} 张上传失败：${error.message}`);
      break;
    }
  }

  if (uploaded) {
    showToast(`已上传 ${uploaded} 张例图，记得保存。`);
  }
});

function validateTemplates() {
  syncFormToState();

  for (const template of adminState.templates) {
    if (!template.title || !template.category || !template.prompt) {
      showToast("请补全模板名称、分类和提示词正文。");
      return false;
    }
    template.category = normalizeCategory(template.category);
    if (!template.id) template.id = uid();
    if (!template.variables) template.variables = {};
    if (!Array.isArray(template.examples)) template.examples = [];
  }

  // 同一张图被多个模板引用 = 上传时选错了模板，保存前拦一下
  const owners = new Map();
  adminState.templates.forEach((template) => {
    (Array.isArray(template.examples) ? template.examples : []).forEach((example) => {
      const src = String((example && example.src) || "").trim();
      if (!src) return;
      if (!owners.has(src)) owners.set(src, []);
      owners.get(src).push(template.title || "未命名模板");
    });
  });
  const shared = [...owners.entries()].filter(([, titles]) => titles.length > 1);
  if (shared.length) {
    const detail = shared
      .map(([src, titles]) => `· ${src.split("/").pop()}  →  ${titles.join(" / ")}`)
      .join("\n");
    const confirmed = window.confirm(
      `有 ${shared.length} 张例图被多个模板同时引用，通常是上传时选错了模板：\n\n${detail}\n\n确定还要保存吗？`,
    );
    if (!confirmed) return false;
  }

  return true;
}

async function saveAll() {
  if (!validateTemplates()) return;

  try {
    const res = await fetch("/api/admin/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(adminState.templates),
    });
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const err = await res.json();
        if (err && err.error) message = err.error;
      } catch {
      }
      throw new Error(message);
    }
    adminState.dirty = false;
    adminState.dirtyTemplates.clear();

    // 云端数据已落库，此时才清理不再被引用的旧图文件（保存前删会有裂图风险）
    const orphans = findOrphanImages();
    if (orphans.length) {
      saveStatus.textContent = `已保存，正在清理 ${orphans.length} 个旧图片文件…`;
      const result = await deleteOrphanImages(orphans);
      const removed = result.deleted.length;
      const failed = result.failed.length;
      if (failed) {
        saveStatus.textContent = `已保存。清理了 ${removed} 个旧文件，${failed} 个失败。`;
        showToast(`已保存，但有 ${failed} 个旧图片文件删除失败（不影响前台显示）。`);
      } else if (removed) {
        saveStatus.textContent = `已保存到云端，并清理了 ${removed} 个旧图片文件。`;
        showToast(`已保存，清理了 ${removed} 个旧图片文件。`);
      } else {
        saveStatus.textContent = "已保存到云端。";
        showToast("已保存。");
      }
    } else {
      saveStatus.textContent = "已保存到云端。";
      showToast("已保存。");
    }

    // 清理完再刷新基线，避免同一批孤儿被重复提交
    adminState.baselineSrcs = collectExampleSources();
    render();
  } catch (error) {
    showToast(`保存失败：${error.message}`);
  }
}

async function restoreDefaults() {
  const confirmed = window.confirm("确定放弃未保存的修改，重新从云端加载吗？");
  if (!confirmed) return;

  await loadAdminTemplates();
  adminState.dirty = false;
  adminState.dirtyTemplates.clear();
  saveStatus.textContent = "已重新加载云端数据。";
  render();
}

adminForm?.addEventListener("input", () => {
  syncFormToState();
  markDirty(adminState.selectedId);
  renderTemplateList();
  adminEditorTitle.textContent = getSelectedTemplate()?.title || "模板详情";
});

adminSearch?.addEventListener("input", (event) => {
  adminState.query = event.target.value;
  renderTemplateList();
});

newTemplateButton?.addEventListener("click", createTemplate);
duplicateButton?.addEventListener("click", duplicateTemplate);
deleteButton?.addEventListener("click", deleteTemplate);
uploadExampleButton?.addEventListener("click", uploadExample);
addVariableButton?.addEventListener("click", addVariable);
saveAllButton?.addEventListener("click", saveAll);
restoreDefaultsButton?.addEventListener("click", restoreDefaults);

window.addEventListener("beforeunload", (event) => {
  if (!adminState.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

initializeAdmin();
