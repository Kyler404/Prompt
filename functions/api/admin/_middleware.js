// /api/admin/* 统一守卫 —— 自建登录体系真正的安全边界。
// Cloudflare Access 移除后，这里就是挡住写接口的唯一防线：
// 除 login / logout 两个白名单接口外，一律要求有效会话 cookie，否则 401。
import { verifySession } from "./_auth.js";

const PUBLIC_PATHS = new Set(["/api/admin/login", "/api/admin/logout"]);

export async function onRequest(context) {
  const { request, env } = context;
  const path = new URL(request.url).pathname;

  if (PUBLIC_PATHS.has(path)) return context.next();

  const auth = await verifySession(request, env);
  if (!auth.ok) {
    // 没配密钥属于部署问题，500 提示比 401 更能引导到 README
    if (auth.reason === "no-secret") {
      return json({ error: "服务端未配置 SESSION_SECRET 环境变量，请按 README「管理员登录」一节配置后重新部署。" }, { status: 500 });
    }
    return json({ error: "未登录或会话已过期" }, { status: 401 });
  }
  return context.next();
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
    ...init,
  });
}
