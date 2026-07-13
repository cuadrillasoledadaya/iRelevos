import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    pathname === '/sw.js' ||
    pathname === '/manifest.json' ||
    pathname.startsWith('/workbox-') ||
    !!pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Pass through static assets and API routes without auth check
  if (isStaticAsset(pathname)) {
    return NextResponse.next()
  }

  // Create server-side Supabase client with cookie propagation
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isAuthenticated = !!user

  // Public routes: if authenticated, redirect to home
  if (isPublicRoute(pathname)) {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return NextResponse.next()
  }

  // Protected routes: require authentication
  if (isProtectedRoute(pathname)) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    return NextResponse.next()
  }

  // All other routes: pass through
  return NextResponse.next()
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
