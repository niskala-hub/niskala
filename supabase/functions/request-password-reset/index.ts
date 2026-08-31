import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Kirim email reset password via Resend API ──────────────────────
async function sendResetEmail(
  email: string,
  resetLink: string,
  appName: string,
): Promise<{ sent: boolean; error: string | null }> {
  const resendKey = Deno.env.get('RESEND_API_KEY') || ''
  const fromEmail = Deno.env.get('EMAIL_FROM') || 'noreply@resend.dev'

  if (!resendKey) {
    return { sent: false, error: 'RESEND_API_KEY tidak dikonfigurasi' }
  }

  const html = `
<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Password ${appName}</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e5e5e5;">
          <!-- Header -->
          <tr>
            <td style="padding:40px 40px 24px;border-bottom:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#888;font-weight:500;">
                ${appName}
              </p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:300;color:#1a1a1a;letter-spacing:-0.01em;">
                Reset Password
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
                Halo,
              </p>
              <p style="margin:0 0 16px;font-size:14px;color:#444;line-height:1.6;">
                Kami menerima permintaan untuk mereset password akun Anda di <strong>${appName}</strong>.
                Klik tombol di bawah untuk membuat password baru.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#888;">
                Link ini berlaku selama 1 jam.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="${resetLink}"
                style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.05em;">
                RESET PASSWORD
              </a>
            </td>
          </tr>
          <!-- Link fallback -->
          <tr>
            <td style="padding:0 40px 32px;border-top:1px solid #f0f0f0;">
              <p style="margin:24px 0 8px;font-size:12px;color:#888;line-height:1.6;">
                Jika tombol tidak berfungsi, salin link berikut ke browser:
              </p>
              <p style="margin:0;font-size:11px;color:#1a1a1a;word-break:break-all;">
                ${resetLink}
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;background:#fafafa;border-top:1px solid #f0f0f0;">
              <p style="margin:0;font-size:11px;color:#bbb;line-height:1.6;">
                Jika Anda tidak meminta reset password, abaikan email ini. Password Anda tidak akan berubah.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${appName} <${fromEmail}>`,
        to: [email],
        subject: `Reset password ${appName}`,
        html,
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return { sent: false, error: result?.message || `Resend error: ${res.status}` }
    }
    return { sent: true, error: null }
  } catch (e) {
    return { sent: false, error: (e as Error).message }
  }
}

// ── Main Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const defaultSiteUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || ''
    const redirectTo = typeof body?.redirect_to === 'string' && body.redirect_to.trim() !== ''
      ? body.redirect_to
      : (defaultSiteUrl ? `${defaultSiteUrl.replace(/\/+$/, '')}/auth/change-password` : undefined)
    const mode = body?.mode === 'owner' ? 'owner' : 'email'
    const appName = Deno.env.get('APP_NAME') || 'NISKALA'

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return json({ error: 'Email tidak valid' }, 400)
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Look up the profile (never reveal whether it exists)
    const { data: profile } = await admin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (mode === 'owner') {
      if (profile) {
        // Ask the owner / co-owner to hand out a new password
        await admin.from('password_reset_requests').insert({
          email,
          user_id: profile.id,
          status: 'pending',
          note: typeof body?.note === 'string' ? body.note.slice(0, 500) : null,
        })
      }
    } else {
      // ── Generate reset link via admin API ──────────────────────
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email,
        options: {
          redirectTo: redirectTo || undefined,
        },
      })

      if (!linkErr && linkData?.properties?.action_link) {
        // Kirim email custom via Resend
        const { sent, error: mailErr } = await sendResetEmail(
          email,
          linkData.properties.action_link,
          appName,
        )

        if (!sent) {
          // Fallback ke Supabase SMTP bawaan
          const anon = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
          )
          const { error: anonErr } = await anon.auth.resetPasswordForEmail(email, {
            redirectTo: redirectTo || undefined,
          })
          if (anonErr) {
            console.error('Resend error:', mailErr, '| Supabase SMTP error:', anonErr.message)
          }
        }
      } else {
        // Jika generateLink gagal, coba Supabase SMTP langsung
        const anon = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { error: anonErr } = await anon.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo || undefined,
        })
        if (anonErr) {
          return json({ error: anonErr.message }, 400)
        }
      }
    }

    // Always return ok to avoid leaking which emails exist
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
