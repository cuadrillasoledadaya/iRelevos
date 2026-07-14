import { http, HttpResponse } from 'msw'

const VALID_USER = {
  id: 'test-user-123',
  email: 'test@example.com',
  aud: 'authenticated',
  role: 'authenticated',
}

const VALID_SESSION = {
  access_token: 'valid-access-token',
  refresh_token: 'valid-refresh-token',
  expires_in: 3600,
  token_type: 'bearer',
  user: VALID_USER,
}

/**
 * msw handlers for Supabase Auth API endpoints.
 * Used by the middleware integration test.
 */
export const handlers = [
  // GET /auth/v1/user — getUser() endpoint (Supabase Auth JS calls GET, not POST)
  http.get('https://test-project.supabase.co/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({ code: 401, msg: 'Invalid token' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    if (token === 'tampered-token') {
      return HttpResponse.json({ code: 401, msg: 'Invalid token' }, { status: 401 })
    }
    if (token === 'expired-token') {
      return HttpResponse.json({ code: 401, msg: 'Token expired' }, { status: 401 })
    }
    if (token === 'valid-access-token') {
      return HttpResponse.json(VALID_USER, { status: 200 })
    }

    return HttpResponse.json({ code: 401, msg: 'Invalid token' }, { status: 401 })
  }),

  // POST /auth/v1/token — token refresh endpoint
  http.post('https://test-project.supabase.co/auth/v1/token', async ({ request }) => {
    const body = await request.json() as Record<string, string>
    if (body.grant_type === 'refresh_token' && body.refresh_token === 'valid-refresh-token') {
      return HttpResponse.json(VALID_SESSION, { status: 200 })
    }
    return HttpResponse.json({ code: 400, msg: 'Invalid refresh token' }, { status: 400 })
  }),
]

// Handler for simulating Supabase 5xx
export function createServerErrorHandler() {
  return http.get('https://test-project.supabase.co/auth/v1/user', () => {
    return HttpResponse.json({ code: 500, msg: 'Internal server error' }, { status: 500 })
  })
}
