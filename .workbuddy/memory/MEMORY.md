# Prompt Studio 项目长期约定

## 静态资源必须带版本号（最重要的一条）
Cloudflare Pages 的缓存策略不一致：
- HTML：`Cache-Control: max-age=0, must-revalidate`（**每次都拿最新**）
- JS / CSS：`Cache-Control: public, max-age=14400`（**4 小时强缓存**）

所以改动 JS/CSS 后，用户浏览器会拿到「**新 HTML + 旧 JS**」。若新版 HTML 删掉了某个 id，
旧脚本里无保护的 `xxxButton.addEventListener(...)` 会抛 TypeError，
导致后面的 `initializeAdmin()` 永不执行 —— **表现为后台/前台整页空白，但云端数据完好无损**。

**规则：每次改 JS 或 CSS，必须把 `index.html` / `admin.html` 里所有 `?v=` 版本号 +1。**
当前版本：`?v=1.0.8`。

配套防御（已做）：
- 顶层事件绑定一律用可选链 `el?.addEventListener(...)`，元素缺失只丢功能、不炸整页
- 两个 HTML 的 `<head>` 里有早期 `window.onerror` 兜底，脚本崩溃时顶部显示「请 Ctrl+Shift+R 硬刷新」红色提示条（`.boot-error`），不再白屏

## 诊断「页面空白」的固定顺序
1. 先查数据是否真丢：`curl -s "https://guoke404.xin/api/templates?_=$(date +%s)"`，
   看返回条数 + `cf-cache-status`（DYNAMIC 表示没被 CDN 缓存）
2. 数据没丢 → 一定是前端 JS 崩了 → 查缓存头是否错配
3. 交叉校验 HTML 的 id 与 JS 的 `querySelector("#xxx")`（脚本见下方）
4. 对比 `git show <旧commit>:admin.js` 找崩溃点，确认它是否阻断了初始化调用

## 其他约定
- 后台页面读的是**公开**接口 `/api/templates`（不是 `/api/admin/templates`）；写接口才受 Cloudflare Access 保护
- 数据已迁 D1，**改代码 + push 不会改变线上显示**，云端数据会覆盖代码兜底
- 例图存 R2（`prompt-examples`），公开域名 `https://img.guoke404.xin`，命名规则 `t{模板序号}-{例图序号}.{ext}`（序号 1 起，同序号覆盖）
- 上传接口有 1MB 体积限制；压图用本机 ffmpeg：`ffmpeg -i 原图.png -q:v 78 输出.webp`
- 国内站点不要引 Google Fonts（阻塞渲染 → 白屏），一律系统字体栈
