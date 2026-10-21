// 临时诊断端点：直接调用 Cloudflare Email Service，返回原始状态码与响应体。
// 用于排查线上发信链路，定位后立即删除。
export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { env } = context;
  const CF_ACCOUNT_ID = (env.CF_ACCOUNT_ID || "").replace(/\s+/g, "");
  const CF_EMAIL_TOKEN = (env.CF_EMAIL_TOKEN || "").replace(/\s+/g, "");

  const diag: Record<string, unknown> = {
    hasAccountId: Boolean(CF_ACCOUNT_ID),
    accountIdLength: CF_ACCOUNT_ID.length,
    hasToken: Boolean(CF_EMAIL_TOKEN),
    tokenLength: CF_EMAIL_TOKEN.length,
    tokenHasBadChars: /[^A-Za-z0-9\-_]/.test(CF_EMAIL_TOKEN),
  };
  if (!CF_ACCOUNT_ID || !CF_EMAIL_TOKEN) {
    return Response.json({ diag, error: "env vars missing" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/email/sending/send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${CF_EMAIL_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "noreply@switchlivo.com",
          to: ["info@switchlivo.com"],
          reply_to: "info@switchlivo.com",
          subject: "Switchlivo 发信链路诊断测试",
          html: "<p>This is a diagnostic test from the contact form backend.</p>",
          text: "This is a diagnostic test from the contact form backend.",
        }),
      }
    );
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
