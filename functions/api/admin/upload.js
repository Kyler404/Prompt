// POST /api/admin/upload —— 上传例图到 R2（受 Cloudflare Access 保护 /api/admin/*）
//
// 公开访问前缀：R2 bucket「prompt-examples」绑定自定义域名 img.guoke404.xin 后，
// 图片通过 https://img.guoke404.xin/<key> 公开访问。
// 若你改用别的域名，改下面这行即可。

const PUBLIC_BASE = "https://img.guoke404.xin";

// 体积上限：超过就拒绝，避免原图直传导致前台加载卡顿
// （PNG 原图动辄 1-3MB，转 WebP 后通常只剩 5%）
const MAX_SIZE = 1024 * 1024; // 1MB

// 缓存策略：必须每次回源校验。
// 覆盖写同名对象时 Cloudflare 边缘缓存**不会自动失效**，会一直吐旧图 ——
// 表现为「换了图但页面还是原来那张」。设成 max-age=0 + must-revalidate 后，
// 每次请求都会拿 ETag 回源校验：没变就 304（几乎不耗流量），变了立刻更新。
const CACHE_CONTROL = "public, max-age=0, must-revalidate";

// 命名规则：t{模板短码}-{例图序号}.{扩展名}
//   模板短码 slug：由模板 id 派生的固定短码（见前端 templateSlug），与模板在列表中的
//                  位置无关 —— 增删/排序模板都不会让它变化，因此不会撞上别的模板的文件。
//   例图序号 exampleIndex ：该模板下的第几张例图，1 起
//   例：某模板短码 4578a 的第 2 张 → t4578a-2.webp
//
// ⚠️ 早期版本用的是「模板在数组中的位置」当序号，新增模板会被 unshift 到最前面，
//    导致所有位置下移、新模板复用到别的模板正在用的文件名，直接把对方的图覆盖掉。
//    所以改成绑定模板 id，位置再怎么变都不会撞车。
//
// 同一短码 + 同一序号重复上传会覆盖旧图（方便直接替换，不用先删）。
function buildKey(slug, exampleIndex, ext) {
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "webp";
  const s = safeSlug(slug);
  const e = clampIndex(exampleIndex);
  return `t${s}-${e}.${safeExt}`;
}

function safeSlug(value) {
  const raw = String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!raw) return "unknown";
  return raw.slice(0, 12);
}

function clampIndex(value) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 999);
}

export async function onRequestPost(context) {
  const { env, request } = context;
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!file || typeof file === "string") {
      return json({ error: "缺少图片文件" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return json(
        {
          error: `图片 ${(file.size / 1024 / 1024).toFixed(1)}MB 超过 1MB 上限，请先压缩再上传`,
        },
        { status: 400 },
      );
    }

    const originalName = String(file.name || "image.webp").toLowerCase();
    const ext = originalName.includes(".")
      ? originalName.split(".").pop()
      : "webp";

    const key = buildKey(
      formData.get("slug"),
      formData.get("exampleIndex"),
      ext,
    );

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || contentTypeOf(ext),
        cacheControl: CACHE_CONTROL,
      },
    });

    const url = `${PUBLIC_BASE}/${key}`;

    // 尽力清一次边缘缓存（覆盖写的旧副本）。
    // 注意：caches.default 只能清当前这个 PoP，其它节点靠上面的 must-revalidate 兜底。
    try {
      if (typeof caches !== "undefined") {
        await caches.default.delete(new Request(url));
      }
    } catch {
      /* 清不掉也不影响：对象已设 must-revalidate */
    }

    return json({ url });
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, { status: 500 });
  }
}

function contentTypeOf(ext) {
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "avif") return "image/avif";
  return "image/png";
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
    ...init,
  });
}
