// POST /api/admin/logout —— 清除会话 cookie（幂等，未登录调用也无妨）
import { clearedSessionCookie } from "./_auth.js";

export async function onRequestPost() {
  return json({ ok: true }, { headers: { "Set-Cookie": clearedSessionCookie() } });
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
