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

    // ===== 暂不发信：校验通过直接返回成功（邮件逻辑后续接入 Zoho/Resend） =====
    console.log(
      "[inquiry]",
      JSON.stringify({
        name,
        email,
        company: data["company"] || "",
        country: data["country"] || "",
        reason: data["reason"] || "",
        message,
        at: new Date().toISOString(),
      })
    );

    return json({ success: true, msg: "ok" }, 200);
  } catch (e) {
    return json({ success: false, msg: "Server error." }, 500);
  }
}
