import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Creates a Supabase client for Edge middleware.
 *
 * `getAll` reads from `request.cookies` (Edge-compatible).
 * `setAll` writes to `response.cookies` with W3 domain injection.
 *
 * NEVER use `cookies()` from `next/headers` here — that is the v1.2.72 root cause.
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        const host =
          process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? new URL(request.url).host
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({ name, value, ...options, domain: host })
        }
      },
    },
  })
}
