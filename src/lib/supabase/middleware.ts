import { createServerClient } from '@supabase/ssr'
import type { NextRequest, NextResponse } from 'next/server'

/**
 * Creates a Supabase client for Edge middleware.
 *
 * `getAll` reads from `request.cookies` (Edge-compatible).
 * `setAll` writes to `response.cookies` with W3 domain injection AND forwards
 * anti-cache headers to `response.headers` to prevent CDN cache poisoning (D8).
 *
 * NEVER use `cookies()` from `next/headers` here — that is the v1.2.72 root cause.
 *
 * The `domain` attribute set by `setAll` is the bare host (no leading dot) — this
 * produces host-only cookies. If you need subdomain sharing (e.g.,
 * `*.i-relevos.vercel.app`), set `NEXT_PUBLIC_COOKIE_DOMAIN=.i-relevos.vercel.app`
 * explicitly.
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        const host =
          process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? new URL(request.url).host
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set({ name, value, ...options, domain: host })
        }
        // Forward anti-cache headers from @supabase/ssr to prevent CDN cache poisoning
        // (Cache-Control, Expires, Pragma — see D8 / REQ-05)
        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value)
        }
      },
    },
  })
}
