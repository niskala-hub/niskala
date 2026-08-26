import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401)

    const { data: isOwner } = await admin.rpc('has_role', {
      _user_id: userData.user.id,
      _role: 'owner',
    })
    if (!isOwner) return json({ error: 'Hanya owner yang bisa mendaftarkan admin' }, 403)

    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 255) {
      return json({ error: 'Email tidak valid' }, 400)
    }
    if (password.length < 8 || password.length > 72) {
      return json({ error: 'Password minimal 8 karakter' }, 400)
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createErr) return json({ error: createErr.message }, 400)

    const newId = created.user!.id
    await admin.from('profiles').upsert({ id: newId, email })
    await admin.from('user_roles').delete().eq('user_id', newId).eq('role', 'owner')
    await admin.from('user_roles').upsert(
      { user_id: newId, role: 'admin' },
      { onConflict: 'user_id,role' },
    )

    return json({ ok: true, user_id: newId })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
