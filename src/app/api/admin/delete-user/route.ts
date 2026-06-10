import { getSupabaseAdmin } from '@/lib/supabaseAdmin'
import { rateLimit } from '@/lib/rateLimit'
import { withCors, handleCorsPreflight } from '@/lib/cors'
import { checkBodySize, jsonResponse } from '@/lib/apiHelpers'
import { isValidUUID } from '@/lib/validation'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

const DELETE_USER_RATE_LIMIT = { limit: 10, windowMs: 60_000 } // 10 per minute

/**
 * DELETE/POST /api/admin/delete-user
 * Body: { uid: string }
 *
 * Borra un usuario de Supabase Auth Y de la tabla profiles.
 * Requiere:
 *  1. Token de autenticación válido
 *  2. El requester debe ser superadmin
 *  3. No podés borrarte a vos mismo
 *
 * Hardened with: rate limiting, CORS, body size check, UUID validation, structured logging.
 */
export async function POST(request: Request) {
  // Handle CORS preflight
  const preflight = handleCorsPreflight(request)
  if (preflight) return preflight

  const startTime = Date.now()
  const route = '/api/admin/delete-user'

  // Body size check (1MB default)
  const sizeCheck = checkBodySize(request)
  if (sizeCheck) {
    logger.error(`${route} 413: body too large`)
    return withCors(sizeCheck, request)
  }

  // Rate limit
  const ip = request.headers.get('x-forwarded-for') ?? 'anonymous'
  const rateResult = rateLimit(ip, DELETE_USER_RATE_LIMIT)
  if (!rateResult.success) {
    logger.warn(`${route} 429: rate limit exceeded for ${ip}`)
    return withCors(
      jsonResponse(
        { error: 'Demasiados intentos. Intentá de nuevo.' },
        { status: 429 },
      ),
      request,
    )
  }

  try {
    const body = (await request.json().catch(() => null)) as { uid?: string }

    if (!body || typeof body.uid !== 'string' || body.uid.trim() === '') {
      return withCors(
        jsonResponse({ error: 'Datos inválidos.' }, { status: 400 }),
        request,
      )
    }

    const uid = body.uid.trim()

    // UUID validation
    if (!isValidUUID(uid)) {
      logger.warn(`${route} 400: invalid UUID format`)
      return withCors(
        jsonResponse({ error: 'Datos inválidos.' }, { status: 400 }),
        request,
      )
    }

    const authHeader = request.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return withCors(
        jsonResponse({ error: 'No autenticado.' }, { status: 401 }),
        request,
      )
    }

    const admin = getSupabaseAdmin()

    // 1. Verificar que el token es válido
    const { data: userData, error: userError } = await admin.auth.getUser(token)
    if (userError || !userData.user) {
      logger.error(`${route} 401: invalid token`, userError?.message)
      return withCors(
        jsonResponse({ error: 'No autenticado.' }, { status: 401 }),
        request,
      )
    }

    // 2. Verificar que el requester es superadmin
    const { data: requesterProfile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (requesterProfile?.role !== 'superadmin') {
      logger.warn(`${route} 403: insufficient role ${requesterProfile?.role}`)
      return withCors(
        jsonResponse({ error: 'No autorizado.' }, { status: 403 }),
        request,
      )
    }

    // 3. No podés borrarte a vos mismo
    if (uid === userData.user.id) {
      return withCors(
        jsonResponse({ error: 'No autorizado.' }, { status: 403 }),
        request,
      )
    }

    // 4. Borrar del auth
    const { error: authError } = await admin.auth.admin.deleteUser(uid)
    if (authError) {
      logger.error(`${route} 500: auth delete failed`, authError.message)
      return withCors(
        jsonResponse(
          { error: 'Error interno. Intentá más tarde.' },
          { status: 500 },
        ),
        request,
      )
    }

    // 5. Borrar de profiles
    const { error: profileError } = await admin
      .from('profiles')
      .delete()
      .eq('id', uid)

    if (profileError) {
      logger.error(
        `${route} 500: profile delete failed`,
        profileError.message,
      )
      return withCors(
        jsonResponse(
          { error: 'Error interno. Intentá más tarde.' },
          { status: 500 },
        ),
        request,
      )
    }

    const duration = Date.now() - startTime
    logger.log(
      `${route} 200: user deleted`,
      JSON.stringify({
        timestamp: new Date().toISOString(),
        route,
        method: 'POST',
        user_id: userData.user.id,
        action: 'delete-user',
        outcome: 'success',
        duration_ms: duration,
      }),
    )

    return withCors(jsonResponse({ success: true }), request)
  } catch (err) {
    const duration = Date.now() - startTime
    logger.error(
      `${route} 500: unexpected error`,
      err instanceof Error ? err.message : 'unknown',
      JSON.stringify({
        timestamp: new Date().toISOString(),
        route,
        method: 'POST',
        action: 'delete-user',
        outcome: 'error',
        duration_ms: duration,
      }),
    )
    return withCors(
      jsonResponse(
        { error: 'Error interno. Intentá más tarde.' },
        { status: 500 },
      ),
      request,
    )
  }
}
