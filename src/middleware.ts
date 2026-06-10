import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that do NOT require authentication
const PUBLIC_PATHS = ['/login', '/register']

// Protected route prefixes (require authentication)
const PROTECTED_PREFIXES = ['/admin', '/plan', '/equipo', '/dashboard']

export function isProtectedRoute(pathname: string): boolean {
  if (pathname === '/') return true
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))
}

export function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon') ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  )
}

/**
 * Find the Supabase auth token cookie.
 * Supabase sets cookies as `sb-<project-ref>-auth-token`.
 * We search for any cookie matching that pattern.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getSupabaseAuthToken(request: NextRequest): string | undefined {
  const cookies = request.cookies.getAll()
  for (const cookie of cookies) {
    if (cookie.name.startsWith('sb-') && cookie.name.endsWith('-auth-token') && cookie.value) {
      return cookie.value
    }
  }
  return undefined
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function middleware(_request: NextRequest) {
  // TEMPORARY DISABLED: Middleware auth check is incompatible with LocalStorage session.
  // Re-enable once @supabase/ssr is integrated for cookie-based auth.
  return NextResponse.next()

  /* 
  const { pathname } = _request.nextUrl

  // Pass through static assets and API routes without auth check
  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  const token = getSupabaseAuthToken(_request)
  const isAuthenticated = !!token

  // Public routes: if authenticated, redirect to home
  if (isPublicRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', _request.url))
    }
    return NextResponse.next()
  }

  // Protected routes: require authentication
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', _request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // All other routes: pass through
  return NextResponse.next()
  */
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/register',
    '/admin/:path*',
    '/plan/:path*',
    '/equipo/:path*',
    '/dashboard/:path*',
  ],
}
