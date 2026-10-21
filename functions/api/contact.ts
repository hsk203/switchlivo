// Cloudflare Pages Function — 询盘接口（纯静态 Astro 站用 functions/ 提供动态端点）
// 密钥从 context.env 读取（Pages 后台 Settings → Environment variables 配置）。
// 注意：Pages Function 不能用 import.meta.env（那是 Astro/Vite 的写法），必须用 context.env。

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

    // MailChannels 发信（keyless，靠 Domain Lockdown + SPF 认证，免费无需升级）
    const mailRes = await fetch("https://api.mailchannels.net/tx/v1/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: "info@switchlivo.com" }] }],
        from: { email: "form@switchlivo.com", name: "网站询盘通知" },
        reply_to: { email: email, name: name },
        subject: `新询盘：来自 ${name}`,
        content: [
          {
            type: "text/html",
            value:
              `<p><strong>客户姓名：</strong>${name}</p>` +
              `<p><strong>客户邮箱：</strong>${email}</p>` +
              `<p><strong>留言内容：</strong></p>` +
              `<p>${message}</p>`,
          },
          {
            type: "text/plain",
            value: `客户姓名：${name}\n客户邮箱：${email}\n留言：${message}`,
          },
        ],
      }),
    });
    const mailResult = await mailRes.json().catch(() => ({}));
    if (!mailRes.ok) {
      console.error("MailChannels发送失败：", mailResult);
      return Response.json(
        { success: false, msg: "邮件发送失败" },
        { status: 500 }
      );
    }

    return Response.json({ success: true, msg: "提交成功" });
  } catch (err) {
    console.error("接口异常：", err);
    return Response.json(
      { success: false, msg: "服务器异常" },
      { status: 500 }
    );
  }
}
