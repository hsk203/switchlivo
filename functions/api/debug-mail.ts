// 临时诊断端点：直接调用 Brevo 发信 API，返回原始状态码与响应体。
// 用于排查线上发信链路，定位后立即删除。
export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { env } = context;
  const BREVO_API_KEY = (env.BREVO_API_KEY || "").replace(/\s+/g, "");

  const diag: Record<string, unknown> = {
    hasKey: Boolean(BREVO_API_KEY),
    keyLength: BREVO_API_KEY.length,
    keyHasBadChars: /[^A-Za-z0-9\-_]/.test(BREVO_API_KEY),
    // 形状指纹：字母数字一律替换为 x，仅暴露结构与标点，不泄露密钥本身
    keyShape:
      BREVO_API_KEY.slice(0, 200).replace(/[A-Za-z0-9]/g, "x").slice(0, 200) || "(空)",
  };
  if (!BREVO_API_KEY) {
    return Response.json({ diag, error: "env vars missing" }, { status: 500 });
  }

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Switchlivo", email: "info@switchlivo.com" },
        to: [{ email: "517519203@qq.com" }],
        replyTo: { email: "info@switchlivo.com" },
        subject: "Switchlivo 发信链路诊断测试",
        htmlContent:
          "<p>This is a diagnostic test from the contact form backend.</p>",
        textContent:
          "This is a diagnostic test from the contact form backend.",
      }),
    });
    const raw = await res.text();
    diag.httpStatus = res.status;
    diag.httpOk = res.ok;
    try {
      diag.body = JSON.parse(raw);
    } catch {
      diag.bodyRaw = raw.slice(0, 500);
    }
    return Response.json({ diag });
  } catch (err) {
    diag.exception = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    return Response.json({ diag }, { status: 500 });
  }
}
