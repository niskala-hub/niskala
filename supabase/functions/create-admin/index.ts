import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Kirim email via Resend API ──────────────────────────────────────
async function sendInviteEmail(
  email: string,
  inviteLink: string,
  senderName: string,
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
  <title>Undangan ${senderName}</title>
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
                ${senderName}
              </p>
              <h1 style="margin:8px 0 0;font-size:24px;font-weight:300;color:#1a1a1a;letter-spacing:-0.01em;">
                Anda Diundang
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
                Anda telah diundang untuk bergabung sebagai administrator di <strong>${senderName}</strong>.
                Klik tombol di bawah untuk mengatur password dan mengakses dashboard.
              </p>
              <p style="margin:0 0 8px;font-size:12px;color:#888;">
                Link ini berlaku selama 24 jam.
              </p>
            </td>
          </tr>
          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <a href="${inviteLink}"
                style="display:inline-block;padding:14px 32px;background:#1a1a1a;color:#ffffff;font-size:13px;font-weight:500;text-decoration:none;letter-spacing:0.05em;">
                ATUR PASSWORD &amp; MASUK
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
                ${inviteLink}
              </p>
            </td>
          </tr>
          <!-- Footer -->
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
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${senderName} <${fromEmail}>`,
        to: [email],
        subject: `Undangan untuk bergabung di ${senderName}`,
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
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify caller identity
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)

    const callerId = userData.user.id

    // Check if caller is owner or co_owner
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerId)

    const roles = (callerRoles || []).map((r: any) => r.role as string)
    const isOwner = roles.includes('owner')
    const isCoOwner = roles.includes('co_owner')
    const canManage = isOwner || isCoOwner

    if (!canManage) {
      return json({ error: 'Hanya owner atau co-owner yang bisa mengundang pengguna' }, 403)
    }

    const body = await req.json().catch(() => null)
    const action = body?.action ?? 'invite'

    // ── ACTION: invite ──────────────────────────────────────────
    if (action === 'invite') {
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
      const password = typeof body?.password === 'string' ? body.password : ''
      const role = typeof body?.role === 'string' ? body.role : 'admin'
      const appName = Deno.env.get('APP_NAME') || 'NISKALA'

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
        return json({ error: 'Email tidak valid' }, 400)
      }
      if (password && (password.length < 8 || password.length > 72)) {
        return json({ error: 'Password minimal 8 karakter' }, 400)
      }

      // Co-owner cannot create co_owner or owner roles
      const allowedRoles = isOwner ? ['admin', 'co_owner'] : ['admin']
      if (!allowedRoles.includes(role)) {
        return json({ error: `Co-owner tidak bisa membuat role ${role}` }, 403)
      }

      const defaultSiteUrl = Deno.env.get('APP_URL') || Deno.env.get('SITE_URL') || ''
      const redirectTo = typeof body?.redirect_to === 'string' && body.redirect_to.trim() !== ''
        ? body.redirect_to
        : (defaultSiteUrl ? `${defaultSiteUrl.replace(/\/+$/, '')}/auth/change-password` : undefined)

      // ── Step 1: Buat user via inviteUserByEmail (ini generate magic link)
      const { data: inviteData, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: redirectTo || undefined,
      })

      if (inviteErr) {
        // Jika user sudah ada, coba buat ulang dengan createUser
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email,
          password: password || undefined,
          email_confirm: true,
        })
        if (createErr) {
          return json({ error: `Gagal membuat user: ${inviteErr.message}` }, 400)
        }
        const newId = created.user!.id

        if (password) {
          await admin.auth.admin.updateUserById(newId, { password })
        }

        await admin.from('profiles').upsert({ id: newId, email, must_change_password: true })
        await admin.from('user_roles').upsert({ user_id: newId, role }, { onConflict: 'user_id,role' })

        // Kirim email reset password sebagai alternatif invitation
        const { sent, error: mailErr } = await sendInviteEmail(email, redirectTo || `${defaultSiteUrl}/auth`, appName)

        return json({ ok: true, user_id: newId, email_sent: sent, email_error: mailErr })
      }

      const newId = inviteData.user.id

      // ── Step 2: Set password default jika disediakan
      if (password) {
        await admin.auth.admin.updateUserById(newId, { password })
      }

      // ── Step 3: Simpan profile
      await admin.from('profiles').upsert({
        id: newId,
        email,
        must_change_password: true,
      })

      // ── Step 4: Assign role
      await admin.from('user_roles').upsert(
        { user_id: newId, role },
        { onConflict: 'user_id,role' },
      )

      // ── Step 5: Generate magic link untuk email custom
      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: redirectTo || undefined,
        },
      })

      let emailSent = false
      let emailError: string | null = null

      if (!linkErr && linkData?.properties?.action_link) {
        // Kirim email custom via Resend dengan link yang tepat
        const { sent, error: mailErr } = await sendInviteEmail(
          email,
          linkData.properties.action_link,
          appName,
        )
        emailSent = sent
        emailError = mailErr
      } else {
        // Fallback: Coba kirim via Supabase SMTP bawaan
        const anon = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { error: resetErr } = await anon.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo || undefined,
        })
        emailSent = !resetErr
        emailError = resetErr?.message || null
      }

      return json({ ok: true, user_id: newId, email_sent: emailSent, email_error: emailError })
    }

    // ── ACTION: resolve_reset_request ───────────────────────────
    if (action === 'resolve_reset_request') {
      const requestId = typeof body?.request_id === 'string' ? body.request_id : ''
      if (!requestId) return json({ error: 'request_id diperlukan' }, 400)

      const { error } = await admin
        .from('password_reset_requests')
        .update({ status: 'resolved', handled_by: callerId, handled_at: new Date().toISOString() })
        .eq('id', requestId)
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }

    // ── ACTION: reset_password ──────────────────────────────────
    if (action === 'reset_password') {
      const targetUserId = typeof body?.user_id === 'string' ? body.user_id : ''
      const newPassword = typeof body?.new_password === 'string' ? body.new_password : ''

      if (!targetUserId) return json({ error: 'user_id diperlukan' }, 400)
      if (newPassword.length < 8 || newPassword.length > 72) {
        return json({ error: 'Password minimal 8 karakter' }, 400)
      }

      // Prevent co_owner from resetting owner's password
      if (!isOwner) {
        const { data: targetRoles } = await admin
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId)
        const targetRoleNames = (targetRoles || []).map((r: any) => r.role as string)
        if (targetRoleNames.includes('owner') || targetRoleNames.includes('co_owner')) {
          return json({ error: 'Co-owner tidak bisa mereset password owner atau co-owner lain' }, 403)
        }
      }

      const { error: updateErr } = await admin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      })
      if (updateErr) return json({ error: updateErr.message }, 400)

      // Mark must_change_password = true
      await admin.from('profiles').update({ must_change_password: true }).eq('id', targetUserId)

      // Close any pending reset requests for this user
      await admin
        .from('password_reset_requests')
        .update({ status: 'resolved', handled_by: callerId, handled_at: new Date().toISOString() })
        .eq('user_id', targetUserId)
        .eq('status', 'pending')

      return json({ ok: true })
    }

    // ── ACTION: delete_user ─────────────────────────────────────
    if (action === 'delete_user') {
      const targetUserId = typeof body?.user_id === 'string' ? body.user_id : ''
      if (!targetUserId) return json({ error: 'user_id diperlukan' }, 400)

      // Get target roles
      const { data: targetRoles } = await admin
        .from('user_roles')
        .select('role')
        .eq('user_id', targetUserId)
      const targetRoleNames = (targetRoles || []).map((r: any) => r.role as string)

      // Cannot delete yourself
      if (targetUserId === callerId) {
        return json({ error: 'Tidak bisa menghapus akun sendiri' }, 403)
      }

      // Co-owner cannot delete owner or other co-owners
      if (!isOwner) {
        if (targetRoleNames.includes('owner') || targetRoleNames.includes('co_owner')) {
          return json({ error: 'Co-owner tidak bisa menghapus owner atau co-owner lain' }, 403)
        }
      }

      // Owner cannot delete other owners
      if (isOwner && targetRoleNames.includes('owner') && targetUserId !== callerId) {
        return json({ error: 'Owner tidak bisa menghapus owner lain' }, 403)
      }

      // Clean up relations first before deleting user from auth
      await admin.from('user_roles').delete().eq('user_id', targetUserId)
      await admin.from('profiles').delete().eq('id', targetUserId)

      const { error: deleteErr } = await admin.auth.admin.deleteUser(targetUserId)
      if (deleteErr) return json({ error: deleteErr.message }, 400)

      return json({ ok: true })
    }

    return json({ error: 'Action tidak dikenal' }, 400)

  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
