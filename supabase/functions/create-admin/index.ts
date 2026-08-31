import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
        return json({ error: 'Email tidak valid' }, 400)
      }
      if (password.length < 8 || password.length > 72) {
        return json({ error: 'Password minimal 8 karakter' }, 400)
      }

      // Co-owner cannot create co_owner or owner roles
      const allowedRoles = isOwner ? ['admin', 'co_owner'] : ['admin']
      if (!allowedRoles.includes(role)) {
        return json({ error: `Co-owner tidak bisa membuat role ${role}` }, 403)
      }

      // Create user with email confirmed
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (createErr) return json({ error: createErr.message }, 400)

      const newId = created.user!.id

      // Insert profile with must_change_password = true
      await admin.from('profiles').upsert({
        id: newId,
        email,
        must_change_password: true,
      })

      // Assign role
      await admin.from('user_roles').upsert(
        { user_id: newId, role },
        { onConflict: 'user_id,role' },
      )

      // Send the invitation email (recovery link so they can set their own password)
      let emailSent = false
      let emailError: string | null = null
      const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : ''
      try {
        const anon = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { error: mailErr } = await anon.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo || undefined,
        })
        if (mailErr) emailError = mailErr.message
        else emailSent = true
      } catch (e) {
        emailError = (e as Error).message
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
