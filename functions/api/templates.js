// GET /api/templates —— 公开读全量（前台匿名访问）
export async function onRequestGet(context) {
  const db = context.env.DB;
  try {
    const row = await db
      .prepare("SELECT data FROM templates WHERE id = 1")
      .first();
    const list = row && row.data ? JSON.parse(row.data) : [];
    return json(list);
  } catch (err) {
    // 表未建 / DB 未绑定 / 解析失败：返回空数组，前端走兜底数据
    return json([]);
  }
}

function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
    ...init,
  });
}
