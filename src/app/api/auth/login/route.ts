import { rateLimit } from '@/lib/rateLimit'
import { jsonResponse } from '@/lib/apiHelpers'
import { withCors, handleCorsPreflight } from '@/lib/cors'

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

  // Parse body — validate shape only, do NOT call Supabase auth
  const body = await request.json().catch(() => null)
  if (!body || typeof body.email !== 'string' || typeof body.password !== 'string') {
    return withCors(
      jsonResponse({ error: 'Email o contraseña incorrectos', remaining }, { status: 400 }),
      request,
    )
  }

  // Pure rate-limit gate — the browser client does the actual signInWithPassword
  return withCors(
    jsonResponse({ ok: true, remaining }),
    request,
  )
}
