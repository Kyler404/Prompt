// GET /admin 页面守卫 —— 有有效会话就回源静态 admin.html，没有就 302 到登录页。
// admin.html 的直链由 _redirects 301 收口到 /admin，入口统一经过这里，
// 所以后台页面本体不会绕过登录被直接访问。
import { verifySession } from "./api/admin/_auth.js";

export async function onRequestGet(context) {
  // 验签抛错按未登录处理，宁可跳登录页也不让页面裸奔
  const auth = await verifySession(context.request, context.env).catch(() => ({ ok: false }));
  if (!auth.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?returnTo=%2Fadmin" },
    });
  }
  return context.env.ASSETS.fetch(context.request);
}
