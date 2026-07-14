import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Creates a Supabase client for server-side use (middleware, server components, API routes).
 *
 * Uses `getAll` + `setAll` cookie pattern for proper token refresh propagation.
 * Always create a new client per request — never share across requests.
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      setAll(cookiesToSet, _headers) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options),
        )
      },
    },
  })
}
