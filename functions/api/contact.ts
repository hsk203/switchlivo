// Cloudflare Pages Function — 询盘接口（纯静态 Astro 站用 functions/ 提供动态端点）
// 密钥从 context.env 读取（Pages 后台 Settings → Environment variables 配置）。
// 注意：Pages Function 不能用 import.meta.env（那是 Astro/Vite 的写法），必须用 context.env。
//
// ⚠️ 运维提醒：修改 Pages 后台环境变量后，必须产生一次新部署（推代码自动部署，或后台点重试部署）才会生效。
//
// 发信通道：Cloudflare Email Service（REST API）。
// 注：MailChannels 的 Cloudflare 免费通道已于 2024-08-31 停服（API 返回 401），故弃用。
// Cloudflare Email Service 发往账号内已验证的 Destination address 免费（Workers Free 可用）。
// 需要的环境变量：CF_ACCOUNT_ID（账号 ID）+ CF_EMAIL_TOKEN（API Token，Email Sending: Edit 权限）。
// 收件 info@switchlivo.com 需先在 Email Service → 目标地址 完成验证。
// （deploy refresh 2026-10-21：触发全新构建以加载后台更新的 CF_EMAIL_TOKEN）

export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { request, env } = context;
  try {
    const body = (await request.json()) as Record<string, string>;
    const { name, email, message } = body;
    // 前端 Turnstile widget 注入的字段名是 cf-turnstile-response（与前端保持一致）
    const turnstileToken = body["cf-turnstile-response"];
    const TURNSTILE_SECRET = env.TURNSTILE_SECRET;

    if (!name || !email || !message || !turnstileToken) {
      return Response.json(
        { success: false, msg: "缺少表单字段" },
        { status: 400 }
      );
    }

    // Turnstile 后端校验（secret 必须来自 Pages env，不能用 import.meta.env）
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET || "",
          response: turnstileToken,
        }),
      }
    );
    const verifyJson = (await verifyRes.json()) as { success: boolean };
    if (!verifyJson.success) {
      return Response.json(
        { success: false, msg: "人机验证失败" },
        { status: 403 }
      );
    }

    // Cloudflare Email Service 发信（REST API，官方文档 2026-10 版字段：
    // from/to 为字符串、reply_to 为字符串、subject/text/html 为字符串）
    // 去除所有空白字符（含中间的换行）：后台粘贴变量时可能断行，导致 "Invalid header value"。
    // 账户 ID 为纯十六进制、token 为字母数字-_，均不含合法空格，此清洗安全。
    const CF_ACCOUNT_ID = (env.CF_ACCOUNT_ID || "").replace(/\s+/g, "");
    const CF_EMAIL_TOKEN = (env.CF_EMAIL_TOKEN || "").replace(/\s+/g, "");

    if (!CF_ACCOUNT_ID || !CF_EMAIL_TOKEN) {
      // 未配置发信凭据时不能假装成功，否则询盘会静默丢失（用户以为提交成功，实际没发信）。
      // 返回 503 并把询盘详情记入 Pages 日志。排查：Pages 新增环境变量后必须重新部署才生效。
      console.error(
        "[inquiry] 发信环境变量缺失（CF_ACCOUNT_ID/CF_EMAIL_TOKEN），询盘未发送：",
        { name, email, message }
      );
      return Response.json(
        { success: false, msg: "邮件服务未就绪，请稍后重试或直接邮件联系我们" },
        { status: 503 }
      );
    }

    const mailRes = await fetch(
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
          reply_to: email,
          subject: `新询盘：来自 ${name}`,
          html:
            `<p><strong>客户姓名：</strong>${name}</p>` +
            `<p><strong>客户邮箱：</strong>${email}</p>` +
            `<p><strong>留言内容：</strong></p>` +
            `<p>${message}</p>`,
          text: `客户姓名：${name}\n客户邮箱：${email}\n留言：${message}`,
        }),
      }
    );
    const mailResult = await mailRes.json().catch(() => ({}));
    if (!mailRes.ok) {
      // 把 Cloudflare 返回的具体错误码/错误信息透出，便于后台排查（不含任何密钥）
      const cfErrors = Array.isArray((mailResult as { errors?: unknown[] }).errors)
        ? (mailResult as { errors: { code?: number; message?: string }[] }).errors
            .map((e) => `${e.code ?? "?"} ${e.message ?? ""}`.trim())
            .join("; ")
        : "";
      console.error("[inquiry] Email Sending 发送失败：", mailResult);
      return Response.json(
        {
          success: false,
          msg: cfErrors
            ? `邮件发送失败（${mailRes.status}）：${cfErrors}`
            : `邮件发送失败（HTTP ${mailRes.status}）`,
        },
        { status: 502 }
      );
    }
    console.log("[inquiry] 发送成功：", mailResult);

    return Response.json({ success: true, msg: "提交成功" });
  } catch (err) {
    const detail = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("接口异常：", detail);
    return Response.json(
      { success: false, msg: `服务器异常（${detail}）` },
      { status: 500 }
    );
  }
}
