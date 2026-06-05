#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const [, , inputPath] = process.argv;

if (!inputPath) {
  console.error("Usage: node tools/apply-templates-json.js <templates.json>");
  process.exit(1);
}

const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.resolve(projectRoot, "script.js");
const jsonPath = path.resolve(process.cwd(), inputPath);

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Cannot read JSON file: ${error.message}`);
  }
}

function validateTemplates(templates) {
  if (!Array.isArray(templates)) {
    throw new Error("Template JSON must be an array.");
  }

  templates.forEach((template, index) => {
    const label = `Template #${index + 1}`;
    if (!template || typeof template !== "object" || Array.isArray(template)) {
      throw new Error(`${label} must be an object.`);
    }
    if (!template.title || !template.category || !template.prompt) {
      throw new Error(`${label} must include title, category, and prompt.`);
    }
    if (!template.id) {
      template.id = `template-${Date.now().toString(36)}-${index}`;
    }
    if (!template.variables || typeof template.variables !== "object" || Array.isArray(template.variables)) {
      template.variables = {};
    }
    if (!Array.isArray(template.examples)) {
      template.examples = [];
    }
    template.examples = template.examples
      .map((example) => ({
        src: String(example?.src || "").trim(),
        title: String(example?.title || "").trim(),
        description: String(example?.description || "").trim(),
      }))
      .filter((example) => example.src);
    template.description = template.description || "";
    template.popularity = Number(template.popularity || 80);
    template.date = template.date || new Date().toISOString().slice(0, 10);
  });
}

function replaceDefaultTemplates(source, templates) {
  const startToken = "const defaultTemplates = ";
  const endToken = ";\n\nconst templates";
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken);

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Cannot find defaultTemplates block in script.js.");
  }

  const nextBlock = `${startToken}${JSON.stringify(templates, null, 2)}`;
  return `${source.slice(0, start)}${nextBlock}${source.slice(end)}`;
}

try {
  const templates = readJson(jsonPath);
  validateTemplates(templates);

  const source = fs.readFileSync(sourcePath, "utf8");
  const updatedSource = replaceDefaultTemplates(source, templates);

  fs.writeFileSync(sourcePath, updatedSource, "utf8");
  console.log(`Updated ${path.relative(projectRoot, sourcePath)} with ${templates.length} templates.`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
