// POST /api/admin/upload —— 上传例图到 R2（受 Cloudflare Access 保护 /api/admin/*）
//
// 公开访问前缀：R2 bucket「prompt-examples」绑定自定义域名 img.guoke404.xin 后，
// 图片通过 https://img.guoke404.xin/<key> 公开访问。
// 若你改用别的域名，改下面这行即可。

const PUBLIC_BASE = "https://img.guoke404.xin";

// 体积上限：超过就拒绝，避免原图直传导致前台加载卡顿
// （PNG 原图动辄 1-3MB，转 WebP 后通常只剩 5%）
const MAX_SIZE = 1024 * 1024; // 1MB

// 命名规则：t{模板序号}-{例图序号}.{扩展名}
//   模板序号 templateIndex：该模板在后台列表中的位置，1 起
//   例图序号 exampleIndex ：该模板下的第几张例图，1 起
//   例：第 3 个模板的第 2 张 → t3-2.webp → https://img.guoke404.xin/t3-2.webp
// 同一序号重复上传会覆盖旧图（方便直接替换，不用先删）。
function buildKey(templateIndex, exampleIndex, ext) {
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "webp";
  const t = clampIndex(templateIndex);
  const e = clampIndex(exampleIndex);
  return `t${t}-${e}.${safeExt}`;
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
      formData.get("templateIndex"),
      formData.get("exampleIndex"),
      ext,
    );

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || contentTypeOf(ext) },
    });

    return json({ url: `${PUBLIC_BASE}/${key}` });
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
