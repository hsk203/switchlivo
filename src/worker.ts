// Cloudflare Worker 入口 — switchlivo.com（由 Pages 迁移而来）
// 静态资源走 env.ASSETS（./dist），动态接口只保留 /api/contact（询盘表单）。
// 由 functions/api/contact.ts（Pages Function）移植：
//   - context.env → Worker 的 env 绑定（wrangler.toml [assets] binding="ASSETS"）
//   - 需要的环境变量（切域名时在 Worker 后台重新配置，勿提交进仓库）：
//       BREVO_API_KEY     Brevo 发信 API Key（形如 xkeysib-...）
//       TURNSTILE_SECRET  Cloudflare Turnstile 后端校验密钥
//   - BREVO_API_KEY 未配置时返回 503 明确报错，绝不假装成功（否则询盘静默丢失）。
//   - TURNSTILE_SECRET 未配置时 Turnstile 校验失败，返回 403（同样不发信）。
// 发信通道：Brevo REST API（POST https://api.brevo.com/v3/smtp/email），
// 发件人/收件人 info@switchlivo.com，客户邮箱走 replyTo。

interface Env {
  ASSETS: Fetcher;
  BREVO_API_KEY?: string;
  TURNSTILE_SECRET?: string;
}

// 表单字段一律转义后再进邮件正文，防止 HTML 注入
function esc(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function handleContact(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as Record<string, string>;
    const { name, email, message } = body;
    const company = (body.company || "").trim();
    const country = (body.country || "").trim();
    const product = (body.product || "").trim();
    const reason = (body.reason || "").trim();
    // 前端 Turnstile widget 注入的字段名是 cf-turnstile-response（与前端保持一致）
    const turnstileToken = body["cf-turnstile-response"];
    const TURNSTILE_SECRET = env.TURNSTILE_SECRET;

    if (!name || !email || !message || !turnstileToken) {
      return Response.json(
        { success: false, msg: "缺少表单字段" },
        { status: 400 }
      );
    }

    // Turnstile 后端校验
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
    // 清除所有空白字符：后台粘贴变量时可能断行，导致 Authorization 头非法。
    const BREVO_API_KEY = (env.BREVO_API_KEY || "").replace(/\s+/g, "");

    if (!BREVO_API_KEY) {
      // 未配置发信凭据时不能假装成功，否则询盘会静默丢失（用户以为提交成功，实际没发信）。
      console.error("[inquiry] BREVO_API_KEY 未配置，询盘未发送：", {
        name,
        email,
        message,
      });
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
        subject: `新询盘：来自 ${name}${product ? ` · ${product}` : ""}`,
        htmlContent:
          `<p><strong>客户姓名：</strong>${esc(name)}</p>` +
          `<p><strong>客户邮箱：</strong>${esc(email)}</p>` +
          (company ? `<p><strong>公司：</strong>${esc(company)}</p>` : "") +
          (country ? `<p><strong>国家/地区：</strong>${esc(country)}</p>` : "") +
          (product
            ? `<p><strong>询价产品：</strong>${esc(product)}</p>`
            : "") +
          (reason ? `<p><strong>询价类型：</strong>${esc(reason)}</p>` : "") +
          `<p><strong>留言内容：</strong></p>` +
          `<p>${esc(message)}</p>`,
        textContent:
          `客户姓名：${name}\n客户邮箱：${email}\n` +
          (company ? `公司：${company}\n` : "") +
          (country ? `国家/地区：${country}\n` : "") +
          (product ? `询价产品：${product}\n` : "") +
          (reason ? `询价类型：${reason}\n` : "") +
          `留言：${message}`,
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
    const detail =
      err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    console.error("接口异常：", detail);
    return Response.json(
      { success: false, msg: `服务器异常（${detail}）` },
      { status: 500 }
    );
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/contact") {
      if (request.method !== "POST") {
        return Response.json(
          { success: false, msg: "仅支持 POST" },
          { status: 405 }
        );
      }
      return handleContact(request, env);
    }
    // 其余全部走静态资源（./dist），与 Pages 行为一致。
    return env.ASSETS.fetch(request);
  },
};
