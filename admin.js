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
  popularityInput.value = template.popularity ?? 80;
  dateInput.value = template.date || today();
  descriptionInput.value = template.description || "";
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
  template.popularity = Number(popularityInput.value || 0);
  template.date = dateInput.value || today();
  template.description = descriptionInput.value.trim();
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
    description: "在这里填写这个模板适合什么场景。",
    popularity: 80,
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
// 命名规则（服务端统一生成，前端只传序号）：
//   t{模板序号}-{例图序号}.{扩展名}
//   模板序号 = 该模板在后台列表中的位置（1 起）
//   例图序号 = 该模板下第几张例图（1 起）
// 例：列表第 3 个模板的第 2 张例图 → t3-2.webp
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

  const templateIndex = adminState.templates.findIndex((item) => item.id === template.id) + 1;
  let exampleIndex = exampleRows.querySelectorAll(".example-row").length;
  let uploaded = 0;

  for (const file of files) {
    exampleIndex += 1;
    showToast(`上传中…（第 ${exampleIndex} 张）`);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("templateIndex", String(templateIndex));
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
