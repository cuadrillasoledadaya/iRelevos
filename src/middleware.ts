import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })
  const supabase = createMiddlewareClient(request, response)

  let user: { id: string } | null = null
  try {
    const {
      data: { user: fetchedUser },
    } = await supabase.auth.getUser()
    user = fetchedUser
  } catch (error) {
    // If getUser() throws (network error, not a structured error),
    // treat as unauthenticated — redirect to /login, no 500.
    if (process.env.NODE_ENV === 'development') {
      console.error('[middleware] getUser() failed:', error)
    }
    user = null
  }

  const { pathname } = request.nextUrl

  // Pass through static assets and API routes without auth check
  if (isStaticAsset(pathname)) {
    return response
  }

  // Public routes: if authenticated, redirect to home
  if (isPublicRoute(pathname)) {
    if (user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return response
  }

  // Protected routes: require authentication
  if (isProtectedRoute(pathname)) {
    if (!user) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return response
  }

  // All other routes: pass through (with refreshed Set-Cookie)
  return response
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
