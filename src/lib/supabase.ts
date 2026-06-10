import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/**
 * Session timeout is configured in Supabase Dashboard → Auth → Settings → JWT Settings.
 * Current setting: 86400 seconds (24 hours of inactivity).
 * The Supabase SDK auto-refreshes tokens while the user is active.
 * After expiry, the middleware redirects to /login with ?redirect= preserved.
 * See docs/operations/security.md for rotation and configuration procedures.
 */
export const SESSION_TIMEOUT_SECONDS = 86400 // 24 hours

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
