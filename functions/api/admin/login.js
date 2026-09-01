// POST /api/admin/login —— 校验管理员密码，签发会话 cookie（7 天）
//
// 防爆破：同一 IP 15 分钟内失败满 5 次就 429，失败记录存 D1 的 login_attempts 表
// （首次使用时懒建表，成功登录后清掉该 IP 的记录）。要更严格的限速可在
// Dashboard 另配 WAF rate limiting 规则，两者叠加不冲突。
import {
  issueSessionToken,
  sessionCookie,
  verifyPassword,
} from "./_auth.js";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
let tableEnsured = false;

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    // 两个凭据环境变量缺一个都无法工作，直接 500 把问题挑明
    if (!env.ADMIN_PASSWORD_HASH) {
      return json({ error: "服务端未配置 ADMIN_PASSWORD_HASH，请按 README「管理员登录」一节生成并配置后重新部署。" }, { status: 500 });
    }
    if (!env.SESSION_SECRET) {
      return json({ error: "服务端未配置 SESSION_SECRET，请按 README「管理员登录」一节配置后重新部署。" }, { status: 500 });
    }

    const body = await request.json().catch(() => null);
    const password = body && typeof body.password === "string" ? body.password.trim() : "";
    if (!password) return json({ error: "请输入密码。" }, { status: 400 });

    const ip = clientIp(request);
    if (await isRateLimited(env.DB, ip)) {
      return json({ error: "尝试次数过多，请 15 分钟后再试。" }, { status: 429 });
    }

    if (!(await verifyPassword(password, env.ADMIN_PASSWORD_HASH))) {
      await recordFailure(env.DB, ip);
      return json({ error: "密码错误。" }, { status: 401 });
    }
    await clearFailures(env.DB, ip);

    const { token } = await issueSessionToken(env.SESSION_SECRET);
    return json({ ok: true }, { headers: { "Set-Cookie": sessionCookie(token) } });
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, { status: 500 });
  }
}

function clientIp(request) {
  return request.headers.get("CF-Connecting-IP") || "unknown";
}

async function isRateLimited(db, ip) {
  if (!db) return false; // 没绑定 D1 就放弃限速，不把登录整个堵死
  try {
    await ensureTable(db);
    const cutoff = Date.now() - WINDOW_MS;
    await db.prepare("DELETE FROM login_attempts WHERE ts < ?").bind(cutoff).run();
    const row = await db
      .prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ? AND ts > ?")
      .bind(ip, cutoff)
      .first();
    return (row && row.n || 0) >= MAX_ATTEMPTS;
  } catch {
    return false;
  }
}

async function recordFailure(db, ip) {
  if (!db) return;
  try {
    await ensureTable(db);
    await db.prepare("INSERT INTO login_attempts (ip, ts) VALUES (?, ?)").bind(ip, Date.now()).run();
  } catch {
  }
}

async function clearFailures(db, ip) {
  if (!db) return;
  try {
    await db.prepare("DELETE FROM login_attempts WHERE ip = ?").bind(ip).run();
  } catch {
  }
}

async function ensureTable(db) {
  if (tableEnsured) return;
  await db
    .prepare("CREATE TABLE IF NOT EXISTS login_attempts (ip TEXT NOT NULL, ts INTEGER NOT NULL)")
    .run();
  tableEnsured = true;
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(init.headers || {}),
    },
  });
}
