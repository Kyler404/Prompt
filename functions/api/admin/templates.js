// POST /api/admin/templates —— 写全量（受 Cloudflare Access 保护 /api/admin/*）
export async function onRequestPost(context) {
  const db = context.env.DB;
  try {
    const body = await context.request.json();
    if (!Array.isArray(body)) {
      return json({ error: "数据必须是数组" }, { status: 400 });
    }
    await db
      .prepare(
        "INSERT INTO templates (id, data) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET data = excluded.data"
      )
      .bind(JSON.stringify(body))
      .run();
    return json({ ok: true, count: body.length });
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
