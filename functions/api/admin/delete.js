// POST /api/admin/delete —— 批量删除 R2 上的例图（受 Cloudflare Access 保护 /api/admin/*）
//
// 触发时机：后台点「保存到云端」成功后，前端对比保存前后的例图列表，
// 把不再被引用的旧图 URL 传过来清理，避免 R2 里堆积孤儿文件。
//
// 安全约束：
//   1. 只接受本站点公开前缀下的 URL，外部域名一律忽略
//   2. key 必须是平铺文件名（不含 /），禁止 .. 越权
//   3. 单次最多 50 个

const PUBLIC_BASE = "https://img.guoke404.xin";
const KEY_PATTERN = /^[A-Za-z0-9._-]{1,120}$/;
const MAX_ITEMS = 50;

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const body = await request.json();
    const urls = Array.isArray(body && body.urls) ? body.urls : [];

    const keys = [];
    const skipped = [];
    for (const raw of urls.slice(0, MAX_ITEMS)) {
      if (typeof raw !== "string") continue;
      const url = raw.trim();
      if (!url.startsWith(`${PUBLIC_BASE}/`)) {
        skipped.push(url);
        continue;
      }
      const key = url.slice(PUBLIC_BASE.length + 1);
      if (!KEY_PATTERN.test(key) || key.includes("..")) {
        skipped.push(url);
        continue;
      }
      if (!keys.includes(key)) keys.push(key);
    }

    const deleted = [];
    const failed = [];
    for (const key of keys) {
      try {
        await env.BUCKET.delete(key);
        deleted.push(key);
      } catch (err) {
        failed.push({ key, error: String((err && err.message) || err) });
      }
    }

    return json({ deleted, failed, skipped });
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, { status: 500 });
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
    ...init,
  });
}
