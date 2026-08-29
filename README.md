# Prompt Studio

Prompt Studio 是一个面向“生图”和“文笔”创作场景的提示词工作台。你可以在这里浏览模板、编辑关键词、查看示例、预览最终提示词，并一键复制用于生成图片或撰写文案。

## 功能特点

- 支持按“生图 / 文笔 / 收藏”分类浏览模板
- 可编辑模板中的变量，实时生成提示词预览
- 支持查看模板对应的示例图片
- 支持收藏常用模板，便于后续快速调用
- 深色霓虹界面（生图=电青 / 文笔=琥珀双色）
- 提供后台管理页面，在线编辑模板并保存到云端

## 项目结构

- index.html：主界面
- admin.html：后台管理页面
- script.js：前台交互逻辑与模板渲染（内置兜底数据 + 云端覆盖）
- admin.js：后台管理逻辑（在线读写云端数据）
- styles.css：基础样式（浅色基线）
- app-dark.css / admin-dark.css：前台/后台深色霓虹覆盖层
- functions/api/templates.js：读接口（GET，公开）
- functions/api/admin/templates.js：写接口（POST，受 Cloudflare Access 保护）
- wrangler.toml：Cloudflare Pages + D1 配置
- assets/examples：示例图片资源

## 使用方式

1. 打开 index.html，进入主界面
2. 选择创作方向（生图或文笔）
3. 点击模板卡片，查看说明、例图和可编辑变量
4. 修改变量后，预览提示词并复制使用

## 后台管理

访问 admin.html（由 Cloudflare Access 保护）后，可以新增、编辑、删除模板，点「保存到云端」即写入 Cloudflare D1，前台实时生效。

## 说明

前端为静态页面，数据存储在 Cloudflare D1（通过 Pages Functions 读写）。前台先用内置数据秒开，再拉取云端数据覆盖；离线或接口不可用时自动回退到内置数据。首次使用时在后台点一次「保存到云端」即可把内置模板写入云端。