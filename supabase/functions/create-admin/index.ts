import { createClient } from "npm:@supabase/supabase-js@2";

const AUTH_REDIRECT_URL = "https://niskalawear.com/auth/confirm-invite";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendInviteEmail(
  email: string,
  inviteLink: string,
  senderName: string,
): Promise<{ sent: boolean; error: string | null }> {
  const resendKey = Deno.env.get("RESEND_API_KEY") || "";
  const fromEmail = Deno.env.get("EMAIL_FROM") || "noreply@resend.dev";

  if (!resendKey) {
    return { sent: false, error: "RESEND_API_KEY tidak dikonfigurasi" };
  }

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Undangan ${senderName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e5e5;">
          <tr>
            <td style="padding:40px 40px 24px;border-bottom:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#888;font-weight:500;">
                ${senderName}
              </p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:300;color:#1a1a1a;letter-spacing:-0.01em;">
                Anda Diundang
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">Halo,</p>
              <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
                Anda telah diundang untuk bergabung sebagai administrator di <strong>${senderName}</strong>.
                Klik tombol di bawah untuk mengatur password dan mengakses dashboard.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#888;">Link ini berlaku selama 24 jam.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="${inviteLink}"
                style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.05em;">
                ATUR PASSWORD &amp; MASUK
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding:0 40px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:24px 0 8px;font-size:12px;color:#888;line-height:1.6;">
                Jika tombol tidak berfungsi, salin link berikut ke browser:
              </p>
              <p style="margin:0;font-size:11px;color:#1a1a1a;word-break:break-all;">
                ${inviteLink}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px;background:#fafafa;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
                Jika Anda merasa tidak mengharapkan undangan ini, abaikan email ini.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: [email],
        subject: `Undangan untuk bergabung di ${senderName}`,
        html,
      }),
    });

    const result = await res.json();
    if (res.ok) return { sent: true, error: null };
    return {
      sent: false,
      error: result?.message || `Resend error: ${res.status}`,
    };
  } catch (e) {
    return { sent: false, error: (e as Error).message };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const callerId = userData.user.id;
    const { data: callerRoles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roles = (callerRoles || []).map((r: any) => r.role as string);
    const isOwner = roles.includes("owner");
    const isCoOwner = roles.includes("co_owner");

    if (!isOwner && !isCoOwner) {
      return json(
        { error: "Hanya owner atau co-owner yang bisa mengundang pengguna" },
        403,
      );
    }

    const body = await req.json().catch(() => null);
    const action = body?.action ?? "invite";

    const requestOrigin = req.headers.get("origin") || "";
    const defaultSiteUrl =
      requestOrigin ||
      Deno.env.get("APP_URL") ||
      Deno.env.get("SITE_URL") ||
      "";
    const redirectTo =
      typeof body?.redirect_to === "string" && body.redirect_to.trim() !== ""
        ? body.redirect_to
        : defaultSiteUrl
          ? `${defaultSiteUrl.replace(/\/+$/, "")}/auth/confirm-invite`
          : AUTH_REDIRECT_URL;

    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const hasResend = resendKey && !resendKey.startsWith("re_GANTI");
    const appName = Deno.env.get("APP_NAME") || "NISKALA";

    // ── ACTION: invite ──────────────────────────────────────────
    if (action === "invite") {
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const password = typeof body?.password === "string" ? body.password : "";
      const role = typeof body?.role === "string" ? body.role : "admin";

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
        return json({ error: "Email tidak valid" }, 400);

      const allowedRoles = isOwner ? ["admin", "co_owner"] : ["admin"];
      if (!allowedRoles.includes(role)) {
        return json({ error: `Co-owner tidak bisa membuat role ${role}` }, 403);
      }

      const { data: existingProf } = await admin
        .from("profiles")
        .select("id, must_change_password")
        .eq("email", email)
        .maybeSingle();

      if (existingProf && !existingProf.must_change_password) {
        return json(
          {
            error:
              "Pengguna dengan email ini sudah terdaftar dan akunnya aktif.",
          },
          400,
        );
      }

      let userId: string | null = existingProf?.id || null;
      let emailSent = false;
      let emailError: string | null = null;

      if (hasResend) {
        // Gunakan generateLink dengan type "invite"
        const { data: linkData, error: linkErr } =
          await admin.auth.admin.generateLink({
            type: "invite",
            email,
            options: { redirectTo },
          });

        if (linkErr || !linkData?.properties?.action_link) {
          return json(
            {
              error: `Gagal membuat undangan: ${linkErr?.message || "Link tidak terbuat"}`,
            },
            400,
          );
        }

        userId = linkData.user.id;
        // ✅ GUNAKAN action_link BAWAAN SUPABASE (Sudah Include Token & Redirect URL Aman)
        const actionLink = linkData.properties.action_link;

        const resendRes = await sendInviteEmail(email, actionLink, appName);
        emailSent = resendRes.sent;
        emailError = resendRes.error;
      } else {
        const { data: inviteData, error: inviteErr } =
          await admin.auth.admin.inviteUserByEmail(email, { redirectTo });
        if (inviteErr)
          return json(
            { error: `Gagal mengirim undangan email: ${inviteErr.message}` },
            400,
          );
        userId = inviteData.user.id;
        emailSent = true;
      }

      if (password && userId) {
        await admin.auth.admin.updateUserById(userId, { password });
      }

      if (userId) {
        await admin
          .from("profiles")
          .upsert({ id: userId, email, must_change_password: true });
        await admin
          .from("user_roles")
          .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
      }

      return json({
        ok: true,
        user_id: userId,
        email_sent: emailSent,
        email_error: emailError,
      });
    }

    // ── ACTION: resend_invite ────────────────────────────────────
    if (action === "resend_invite") {
      const targetUserId =
        typeof body?.user_id === "string" ? body.user_id : "";
      let targetEmail =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";

      if (targetUserId) {
        const { data: prof } = await admin
          .from("profiles")
          .select("email")
          .eq("id", targetUserId)
          .maybeSingle();
        if (prof) targetEmail = prof.email;
      }

      if (!targetEmail)
        return json({ error: "Email pengguna tidak ditemukan" }, 404);

      if (hasResend) {
        const { data: linkData, error: linkErr } =
          await admin.auth.admin.generateLink({
            type: "invite",
            email: targetEmail,
            options: { redirectTo },
          });

        if (linkErr || !linkData?.properties?.action_link) {
          return json(
            { error: `Gagal mengirim ulang undangan: ${linkErr?.message}` },
            400,
          );
        }

        const resendRes = await sendInviteEmail(
          targetEmail,
          linkData.properties.action_link,
          appName,
        );
        if (!resendRes.sent) return json({ error: resendRes.error }, 400);
      } else {
        await admin.auth.resetPasswordForEmail(targetEmail, { redirectTo });
      }

      return json({ ok: true, email_sent: true });
    }

    return json({ error: "Action tidak dikenal" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
