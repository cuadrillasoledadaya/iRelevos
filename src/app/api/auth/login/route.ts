import { rateLimit } from '@/lib/rateLimit'
import { jsonResponse } from '@/lib/apiHelpers'
import { withCors, handleCorsPreflight } from '@/lib/cors'
import { supabase } from '@/lib/supabase'
import { mapAuthError } from '@/lib/errorMap'

const LOGIN_RATE_LIMIT = { limit: 5, windowMs: 15 * 60 * 1000 } // 5 per 15 min

export async function POST(request: Request) {
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request)
  if (preflight) return preflight

  // Rate limit check — key by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const { success, remaining, resetAt } = rateLimit(ip, LOGIN_RATE_LIMIT)

  if (!success) {
    return withCors(
      jsonResponse(
        { error: 'Demasiados intentos. Esperá unos minutos.', remaining: 0, resetAt },
        { status: 429 },
      ),
      request,
    )
  }

  // Parse body
  const body = await request.json().catch(() => null)
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return withCors(
      jsonResponse({ error: 'Email o contraseña incorrectos', remaining }, { status: 400 }),
      request,
    )
  }

  const { email, password } = body

  // Attempt authentication
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Log original error server-side only
    console.error('[login] Auth error:', error.message)

    // Map to generic message — never reveal which error
    const msg = mapAuthError(error.message)

    return withCors(
      jsonResponse({ error: msg, remaining }, request),
      request,
    )
  }

  // Success — return session (cookie is set by Supabase client automatically)
  return withCors(
    jsonResponse({ session: data.session, remaining }),
    request,
  )
}
