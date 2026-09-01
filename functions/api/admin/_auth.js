// —— 后台会话鉴权共享工具 ——
// 被 functions/api/admin/_middleware.js（API 守卫）和 functions/admin.js（页面守卫）引用，
// 下划线开头的文件不会被 Pages 当作路由，只作为模块。
//
// 凭据全部放在 Pages 的加密环境变量里（Dashboard 配置，不入 git）：
//   ADMIN_PASSWORD_HASH  格式：pbkdf2-sha256$<迭代次数>$<salt base64>$<hash base64>
//                        生成命令见 README「管理员登录」一节。
//   SESSION_SECRET       长随机串（建议 openssl rand -hex 32）。换掉它 = 所有会话立即失效。
//
// 会话设计成无状态的自签 token（形如 v1.<过期秒>.<HMAC 签名>），
// 不需要会话表，天然适配 Functions 的无状态运行时。

export const SESSION_COOKIE = "ps_admin_session";
export const SESSION_TTL = 7 * 24 * 60 * 60; // 7 天，单位秒

const encoder = new TextEncoder();

function b64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

// 常量时间比较，防时序侧信道。逐字节异或累计，最后一次性判断。
export function safeEqual(a, b) {
  const ab = encoder.encode(String(a));
  const bb = encoder.encode(String(b));
  const len = Math.max(ab.length, bb.length);
  let diff = ab.length ^ bb.length;
  for (let i = 0; i < len; i += 1) {
    diff |= (ab[i] || 0) ^ (bb[i] || 0);
  }
  return diff === 0;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return b64urlEncode(new Uint8Array(sig));
}

// 签发会话 token：v1.<过期秒级时间戳>.<HMAC 签名>，签名覆盖版本号 + 过期时间
export async function issueSessionToken(secret, now = Date.now()) {
  const exp = Math.floor(now / 1000) + SESSION_TTL;
  const sig = await hmac(secret, `v1|${exp}|ps-admin`);
  return { token: `v1.${exp}.${sig}`, exp };
}

// 校验请求携带的会话 cookie。
// 返回 { ok: true, exp } 或 { ok: false, reason }：
//   reason: "no-secret"(服务端没配密钥) | "no-cookie" | "bad-token" | "expired"
export async function verifySession(request, env) {
  const secret = env.SESSION_SECRET;
  if (!secret) return { ok: false, reason: "no-secret" };

  const header = request.headers.get("Cookie") || "";
  const raw = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  if (!raw) return { ok: false, reason: "no-cookie" };
  const token = raw.slice(SESSION_COOKIE.length + 1);

  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !/^\d+$/.test(parts[1])) {
    return { ok: false, reason: "bad-token" };
  }
  const exp = Number.parseInt(parts[1], 10);
  const expectedSig = await hmac(secret, `v1|${exp}|ps-admin`);
  if (!safeEqual(parts[2], expectedSig)) {
    return { ok: false, reason: "bad-token" };
  }
  if (exp * 1000 <= Date.now()) return { ok: false, reason: "expired" };
  return { ok: true, exp };
}

// 会话 cookie 的 Set-Cookie 值；maxAgeSeconds 传 0 即清除。
// Path 必须是 /：页面守卫（/admin）和 API 守卫（/api/admin/*）都要能读到它。
export function sessionCookie(token, maxAgeSeconds = SESSION_TTL) {
  return `${SESSION_COOKIE}=${token}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

export function clearedSessionCookie() {
  return `${SESSION_COOKIE}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Strict`;
}

// 校验密码：按存储串里的参数重新派生一遍再常量时间比较。
// 存储串格式：pbkdf2-sha256$<迭代次数>$<salt base64>$<hash base64>
export async function verifyPassword(password, stored) {
  const parts = String(stored || "").trim().split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2-sha256") {
    throw new Error("ADMIN_PASSWORD_HASH 格式应为 pbkdf2-sha256$<迭代次数>$<salt>$<hash>");
  }
  const iterations = Number.parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 1 || iterations > 2_000_000) {
    throw new Error("ADMIN_PASSWORD_HASH 的迭代次数不合法");
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(String(password).slice(0, 1024)),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: b64ToBytes(parts[2]), iterations },
    keyMaterial,
    256,
  );
  const actual = btoa(String.fromCharCode(...new Uint8Array(bits)));
  return safeEqual(actual, parts[3]);
}
