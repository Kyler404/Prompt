const ADMIN_PASSWORD_HASH = "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3";
const LEGACY_STORAGE_KEY = "promptTemplates";
const ALLOWED_CATEGORIES = ["生图", "文笔"];

const adminState = {
  templates: structuredClone(window.PROMPT_DEFAULT_TEMPLATES || []),
  selectedId: "",
  query: "",
  dirty: false,
  expandedCategories: new Set(ALLOWED_CATEGORIES),
  dirtyTemplates: new Set(),
};

const adminShell = document.querySelector(".app-shell");
const adminLoginOverlay = document.querySelector("#adminLoginOverlay");
const loginForm = document.querySelector("#loginForm");
const loginPasswordInput = document.querySelector("#loginPasswordInput");
const loginError = document.querySelector("#loginError");

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
const addExampleButton = document.querySelector("#addExampleButton");
const addVariableButton = document.querySelector("#addVariableButton");
const saveAllButton = document.querySelector("#saveAllButton");
const restoreDefaultsButton = document.querySelector("#restoreDefaultsButton");
const exportButton = document.querySelector("#exportButton");
const importButton = document.querySelector("#importButton");
const importFile = document.querySelector("#importFile");
const saveStatus = document.querySelector("#saveStatus");
const themeToggleAdmin = document.querySelector("#themeToggle");
const toastAdmin = document.querySelector("#toast");

function loadAdminTemplates() {
  try {
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
  }

  adminState.templates = structuredClone(window.PROMPT_DEFAULT_TEMPLATES || []);
  adminState.selectedId = adminState.templates[0]?.id || "";
}

async function hashText(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function authenticate(password) {
  return (await hashText(password)) === ADMIN_PASSWORD_HASH;
}

function showLoginError(message) {
  loginError.textContent = message;
}

function showAdminShell() {
  adminLoginOverlay.hidden = true;
  adminLoginOverlay.classList.add("hidden");
  adminShell.hidden = false;
  adminShell.classList.remove("hidden");
  loginPasswordInput.value = "";
  loginError.textContent = "";
  initializeAdmin();
}

function initializeAdmin() {
  loadAdminTemplates();
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
  saveStatus.textContent = "有未导出的修改。导出 JSON 后运行工具写回文件。";
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
  row.innerHTML = `
    <input class="example-src" placeholder="./assets/examples/example.jpg" value="${escapeAttribute(example.src || "")}" />
    <button class="icon-button example-remove" type="button" aria-label="删除例图">×</button>
  `;
  row.querySelector(".example-remove").addEventListener("click", () => {
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
    const src = row.querySelector(".example-src").value.trim();
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

function addExample() {
  exampleRows.appendChild(createExampleRow({ src: "./assets/examples/" }));
  syncFormToState();
  markDirty(adminState.selectedId);
}

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

function saveAll() {
  if (!validateTemplates()) return;

  saveStatus.textContent = "模板格式正确。导出 JSON 后运行 node tools/apply-templates-json.js <文件名> 写回文件。";
  showToast("模板格式正确。");
  render();
}

function restoreDefaults() {
  const confirmed = window.confirm("确定恢复内置模板吗？这会覆盖当前后台里的未保存列表。");
  if (!confirmed) return;

  adminState.templates = structuredClone(window.PROMPT_DEFAULT_TEMPLATES || []);
  adminState.selectedId = adminState.templates[0]?.id || "";
  adminState.dirty = false;
  adminState.dirtyTemplates.clear();
  saveStatus.textContent = "模板只以文件为准。编辑后导出 JSON，再运行工具写回 script.js。";
  render();
}

function exportJson() {
  syncFormToState();
  const blob = new Blob([JSON.stringify(adminState.templates, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `prompt-templates-${today()}.json`;
  link.click();
  URL.revokeObjectURL(url);
  adminState.dirty = false;
  adminState.dirtyTemplates.clear();
  saveStatus.textContent = "已导出 JSON。运行 node tools/apply-templates-json.js <文件名> 写回 script.js。";
  showToast("已导出 JSON。");
}

function importJson(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(String(reader.result));
      if (!Array.isArray(data)) throw new Error("JSON 必须是数组");

      adminState.templates = data.map((template) => ({
        id: template.id || uid(),
        title: template.title || "未命名模板",
        category: normalizeCategory(template.category || "文笔"),
        description: template.description || "",
        popularity: Number(template.popularity || 80),
        date: template.date || today(),
        variables: template.variables || {},
        examples: Array.isArray(template.examples) ? template.examples : [],
        prompt: template.prompt || "",
      }));
      adminState.selectedId = adminState.templates[0]?.id || "";
      markDirty();
      render();
      showToast("JSON 已导入，导出并运行工具后前台生效。");
    } catch (error) {
      showToast(`导入失败：${error.message}`);
    }
  };
  reader.readAsText(file);
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("promptTheme", theme);
  themeToggleAdmin.querySelector(".theme-icon").textContent = theme === "dark" ? "☀" : "☾";
}

adminForm.addEventListener("input", () => {
  syncFormToState();
  markDirty(adminState.selectedId);
  renderTemplateList();
  adminEditorTitle.textContent = getSelectedTemplate()?.title || "模板详情";
});

adminSearch.addEventListener("input", (event) => {
  adminState.query = event.target.value;
  renderTemplateList();
});

newTemplateButton.addEventListener("click", createTemplate);
duplicateButton.addEventListener("click", duplicateTemplate);
deleteButton.addEventListener("click", deleteTemplate);
addExampleButton.addEventListener("click", addExample);
addVariableButton.addEventListener("click", addVariable);
saveAllButton.addEventListener("click", saveAll);
restoreDefaultsButton.addEventListener("click", restoreDefaults);
exportButton.addEventListener("click", exportJson);
importButton.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", (event) => {
  const [file] = event.target.files;
  if (file) importJson(file);
  event.target.value = "";
});

themeToggleAdmin.addEventListener("click", () => {
  const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  applyTheme(current === "dark" ? "light" : "dark");
});

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const password = loginPasswordInput.value.trim();

  if (await authenticate(password)) {
    showAdminShell();
  } else {
    showLoginError("密码错误，请重试。");
    loginPasswordInput.value = "";
    loginPasswordInput.focus();
  }
});

window.addEventListener("beforeunload", (event) => {
  if (!adminState.dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
applyTheme(preferredTheme);
loginPasswordInput.focus();
