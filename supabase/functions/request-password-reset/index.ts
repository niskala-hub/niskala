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
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const redirectTo = typeof body?.redirect_to === 'string' ? body.redirect_to : ''
    const mode = body?.mode === 'owner' ? 'owner' : 'email'

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

    if (profile) {
      if (mode === 'owner') {
        // Ask the owner / co-owner to hand out a new password
        await admin.from('password_reset_requests').insert({
          email,
          user_id: profile.id,
          status: 'pending',
          note: typeof body?.note === 'string' ? body.note.slice(0, 500) : null,
        })
      } else {
        // Send the built-in recovery email
        const anon = createClient(
          Deno.env.get('SUPABASE_URL')!,
          Deno.env.get('SUPABASE_ANON_KEY')!,
        )
        const { error } = await anon.auth.resetPasswordForEmail(email, {
          redirectTo: redirectTo || undefined,
        })
        if (error) return json({ error: error.message }, 400)
      }
    }

    // Always return ok to avoid leaking which emails exist
    return json({ ok: true })
  } catch (e) {
    return json({ error: (e as Error).message }, 500)
  }
})
