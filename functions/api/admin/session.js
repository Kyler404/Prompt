// GET /api/admin/session —— 登录态探测。
// 守卫在 _middleware.js：没登录/过期会在这里被 401 拦下，
// 能跑到这个处理器的请求一定是验签通过的，直接返回 ok。
export async function onRequestGet() {
  return json({ ok: true });
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
    ...init,
  });
}
