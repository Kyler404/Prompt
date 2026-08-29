// POST /api/admin/upload —— 上传例图到 R2（受 Cloudflare Access 保护 /api/admin/*）
//
// 公开访问前缀：R2 bucket「prompt-examples」绑定自定义域名 img.guoke404.xin 后，
// 图片通过 https://img.guoke404.xin/<key> 公开访问。
// 若你改用别的域名，改下面这行即可。

const PUBLIC_BASE = "https://img.guoke404.xin";

// 体积上限：超过就拒绝，避免原图直传导致前台加载卡顿
// （PNG 原图动辄 1-3MB，转 WebP 后通常只剩 5%）
const MAX_SIZE = 1024 * 1024; // 1MB

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

    const originalName = String(file.name || "image.png").toLowerCase();
    const ext = originalName.includes(".")
      ? originalName.split(".").pop()
      : "png";
    const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "png";

    const key = `examples/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${safeExt}`;

    await env.BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "image/png" },
    });

    return json({ url: `${PUBLIC_BASE}/${key}` });
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
