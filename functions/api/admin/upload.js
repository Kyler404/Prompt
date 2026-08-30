// POST /api/admin/upload —— 上传例图到 R2（受 Cloudflare Access 保护 /api/admin/*）
//
// 公开访问前缀：R2 bucket「prompt-examples」绑定自定义域名 img.guoke404.xin 后，
// 图片通过 https://img.guoke404.xin/<key> 公开访问。
// 若你改用别的域名，改下面这行即可。

const PUBLIC_BASE = "https://img.guoke404.xin";

// 体积上限：超过就拒绝，避免原图直传导致前台加载卡顿
// （PNG 原图动辄 1-3MB，转 WebP 后通常只剩 5%）
const MAX_SIZE = 1024 * 1024; // 1MB

// 缓存策略：因为文件名里带唯一令牌、内容永不变，可以放心让各级缓存存一年。
// immutable 甚至能让浏览器连刷新都不回源校验 —— 反正这个地址的内容不可能变。
const CACHE_CONTROL = "public, max-age=31536000, immutable";

// 命名规则：t{模板短码}-{例图序号}-{唯一令牌}.{扩展名}
//   模板短码 slug：由模板 id 派生的固定短码（见前端 templateSlug），与模板在列表中的
//                  位置无关 —— 增删/排序模板都不会让它变化，因此不会撞上别的模板。
//   例图序号 exampleIndex ：该模板下的第几张例图，1 起
//   唯一令牌 token：服务端生成，保证每次上传都是全新地址
//   例：短码 m4578a 的第 2 张 → tm4578a-2-m9x2k1p0z3.webp
//
// 演进历史（都是踩过的坑，别退回去）：
//   1. 最早用「模板在数组中的位置」当序号 → 新增模板插到最前会让位置整体下移，
//      新模板复用到别人的文件名，直接把对方的图覆盖掉。故改为绑定模板 id。
//   2. 后来用 t{短码}-{序号}（会覆盖同名对象）→ R2 覆盖写不会让 CDN/浏览器缓存失效，
//      换了图页面还是显示旧的。故再加唯一令牌，保证「一个地址永远一份内容」。
//
// 替换图片的语义随之改变：不再是覆盖，而是新增一份 + 旧文件由保存时的差集清理回收。
function buildKey(slug, exampleIndex, ext) {
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "webp";
  const s = safeSlug(slug);
  const e = clampIndex(exampleIndex);
  return `t${s}-${e}-${uniqueToken()}.${safeExt}`;
}

// 唯一令牌 = base36 时间戳（8 位，大致按时间有序，便于在 R2 里按名字排序找图）
//            + 8 位随机十六进制（约 43 亿种组合，杜绝瞬时批量上传撞名）
function uniqueToken() {
  const time = Date.now().toString(36).padStart(8, "0");
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  return `${time}${rand}`;
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

    // 地址是全新的，各级缓存里不可能有旧副本，无需 purge
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
