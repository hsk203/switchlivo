// Cloudflare Pages Function — 询盘接口（纯静态 Astro 站用 functions/ 提供动态端点）
// 密钥从 context.env 读取（Pages 后台 Settings → Environment variables 配置）。
// 注意：Pages Function 不能用 import.meta.env（那是 Astro/Vite 的写法），必须用 context.env。
//
// ⚠️ 运维提醒：修改 Pages 后台环境变量后，必须推一次新提交触发【全新部署】才会生效——
//    后台手动「重试部署/Redeploy」复用旧部署的环境变量快照，不会加载新值（实测踩坑）。
//
// 发信通道：Brevo（https://brevo.com，原 Sendinblue，REST API）。
// 为何不用 Cloudflare Email Service：2026-10 官方把 Email Sending 整个功能锁进 Workers Paid 计划
// （后台「电子邮件发送」页强制要求升级），免费计划无法 onboard 发送域名。
// 为何不用 MailChannels：其 Cloudflare 免费通道已于 2024-08-31 停服（API 返回 401）。
// Brevo 免费档：300 封/天；switchlivo.com 域名验证后可发任意收件人，询盘量绰绰有余。
// Brevo 的 DNS 验证记录加在 brevo 子域上，不动根域 MX/SPF，不影响 Zoho 收发信。
// 需要的环境变量：BREVO_API_KEY（API Key，在 Brevo 后台 SMTP & API → API Keys 创建，形如 xkeysib-...）。
// ⚠️ 发件 sender 除了域名验证，**具体地址还必须在 Brevo → Senders 里单独验证过**
//    （实测：只做域名验证不够，未验证的地址每次投递都被 Brevo 以 "sender ... is not valid" 拒绝，
//    API 仍返回 201 但 Logs 里出现 Error 事件，收件人永远收不到）。本站发件人 = info@switchlivo.com，
//    客户回复走 replyTo（客户的邮箱），故 info@ 收到的也是可直回的询盘。
// [部署 2026-10-21] 已接入 BREVO_API_KEY（Pages 生产环境变量），本提交触发全新部署以加载该变量。

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

    // Brevo 发信（REST API：POST https://api.brevo.com/v3/smtp/email，api-key 头认证）
    // 字段：sender{name,email} / to[{email}] / replyTo{email} / subject / htmlContent / textContent。
    // 清除所有空白字符：后台粘贴变量时可能断行，导致 Authorization 头非法。
    const BREVO_API_KEY = (env.BREVO_API_KEY || "").replace(/\s+/g, "");

    if (!BREVO_API_KEY) {
      // 未配置发信凭据时不能假装成功，否则询盘会静默丢失（用户以为提交成功，实际没发信）。
      console.error(
        "[inquiry] BREVO_API_KEY 未配置，询盘未发送：",
        { name, email, message }
      );
      return Response.json(
        { success: false, msg: "邮件服务未就绪，请稍后重试或直接邮件联系我们" },
        { status: 503 }
      );
    }

    const mailRes = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: "Switchlivo", email: "info@switchlivo.com" },
        to: [{ email: "info@switchlivo.com" }],
        replyTo: { email: email },
        subject: `新询盘：来自 ${name}`,
        htmlContent:
          `<p><strong>客户姓名：</strong>${name}</p>` +
          `<p><strong>客户邮箱：</strong>${email}</p>` +
          `<p><strong>留言内容：</strong></p>` +
          `<p>${message}</p>`,
        textContent: `客户姓名：${name}\n客户邮箱：${email}\n留言：${message}`,
      }),
    });
    const mailResult = await mailRes.json().catch(() => ({}));
    if (!mailRes.ok) {
      // 把 Brevo 返回的具体错误信息透出，便于排查（不含任何密钥）
      const detail =
        (mailResult as { message?: string }).message ||
        JSON.stringify(mailResult).slice(0, 200);
      console.error("[inquiry] Brevo 发送失败：", mailResult);
      return Response.json(
        {
          success: false,
          msg: `邮件发送失败（${mailRes.status}）：${detail}`,
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
