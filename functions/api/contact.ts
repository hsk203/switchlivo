// Cloudflare Pages Function — 询盘接口（静态 Astro 站用 functions/ 提供无服务端运行时约束下的动态端点）
// 环境变量 TURNSTILE_SECRET 在 Pages 后台设置（文本类型，生产+预览均勾选）。

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

export async function onRequestPost(context: {
  request: Request;
  env: Record<string, string>;
}): Promise<Response> {
  const { request, env } = context;
  try {
    const ct = request.headers.get("content-type") || "";
    const data: Record<string, string> = {};
    if (ct.includes("application/json")) {
      Object.assign(data, await request.json());
    } else {
      const fd = await request.formData();
      fd.forEach((v, k) => (data[k] = String(v)));
    }

    // 蜜罐：被填了就假装成功，静默丢弃（机器人特征）
    if (data["company_url"] && String(data["company_url"]).trim() !== "") {
      return json({ success: true, msg: "ok" }, 200);
    }

    const name = String(data["name"] || "").trim();
    const email = String(data["email"] || "").trim();
    const message = String(data["message"] || "").trim();
    const renderedAt = Number(data["renderedAt"] || 0);

    if (!name || !email || !message) {
      return json(
        { success: false, msg: "Please fill in name, email and message." },
        400
      );
    }
    if (!EMAIL_RE.test(email)) {
      return json({ success: false, msg: "Invalid email address." }, 400);
    }

    // 后端提交时间校验：渲染→提交 < 2s 视为机器人
    const spend = Date.now() - renderedAt;
    if (!renderedAt || spend < 2000 || spend > 3600000) {
      return json({ success: false, msg: "Submit too fast or expired." }, 403);
    }

    // Turnstile 后端校验
    const token = data["cf-turnstile-response"] || "";
    if (!token) {
      return json({ success: false, msg: "Verification token missing." }, 400);
    }
    const secret = env.TURNSTILE_SECRET;
    if (!secret) {
      return json({ success: false, msg: "Server misconfigured." }, 500);
    }
    const verifyRes = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret,
          response: token,
          remoteip: request.headers.get("cf-connecting-ip") || "",
        }),
      }
    );
    const verifyResult = (await verifyRes.json()) as { success: boolean };
    if (!verifyResult.success) {
      return json({ success: false, msg: "Human verify failed." }, 403);
    }

    // ===== 发信：优先 Resend，其次 Cloudflare Email Service，都未配置则记日志 =====
    const resendKey = env.RESEND_API_KEY;
    const cfAccount = env.CF_ACCOUNT_ID;
    const cfToken = env.CF_EMAIL_TOKEN;
    const payload = {
      name,
      email,
      company: data["company"] || "",
      country: data["country"] || "",
      reason: data["reason"] || "",
      message,
      at: new Date().toISOString(),
    };
    let sent = false;

    if (resendKey) {
      // Resend（免费 100 封/天，无需升级套餐）
      try {
        const r = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "Switchlivo <noreply@switchlivo.com>",
            to: ["info@switchlivo.com"],
            reply_to: email,
            subject: `New inquiry from ${name}${
              payload.company ? " (" + payload.company + ")" : ""
            }`,
            text:
              `Name: ${name}\nEmail: ${email}\n` +
              `Company: ${payload.company}\nCountry: ${payload.country}\n` +
              `Reason: ${payload.reason}\n\nMessage:\n${message}`,
          }),
        });
        if (r.ok) {
          sent = true;
        } else {
          console.error("[resend] failed", r.status, (await r.text()).slice(0, 400));
        }
      } catch (e) {
        console.error("[resend] error", e);
      }
    } else if (cfAccount && cfToken) {
      // Cloudflare Email Service（需 Workers Paid 计划）
      try {
        const r = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/email/sending/send`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${cfToken}`,
            },
            body: JSON.stringify({
              from: { name: "Switchlivo", email: "noreply@switchlivo.com" },
              to: [{ email: "info@switchlivo.com" }],
              reply_to: { email },
              subject: `New inquiry from ${name}${
                payload.company ? " (" + payload.company + ")" : ""
              }`,
              text:
                `Name: ${name}\nEmail: ${email}\n` +
                `Company: ${payload.company}\nCountry: ${payload.country}\n` +
                `Reason: ${payload.reason}\n\nMessage:\n${message}`,
            }),
          }
        );
        const j = (await r.json().catch(() => ({}))) as { success?: boolean };
        if (r.ok && j.success) {
          sent = true;
        } else {
          console.error("[cf-email] failed", r.status, JSON.stringify(j).slice(0, 400));
        }
      } catch (e) {
        console.error("[cf-email] error", e);
      }
    }

    if (!sent) {
      // 未配置或发送失败：记录到函数日志，不丢数据
      console.log("[inquiry]", JSON.stringify(payload));
    }

    return json({ success: true, msg: "ok" }, 200);
  } catch (e) {
    return json({ success: false, msg: "Server error." }, 500);
  }
}
