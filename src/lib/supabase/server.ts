import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for RSC and Route Handlers.
 *
 * Uses `cookies()` from `next/headers` — valid in RSC/Route Handler runtime,
 * NOT in Edge middleware.
 *
 * Must be called within a request scope (RSC, Route Handler, Server Action).
 * Calling at module load time will throw because `next/headers.cookies()`
 * requires a request context.
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          cookieStore.set(name, value, options)
        }
      },
    },
  })
}
