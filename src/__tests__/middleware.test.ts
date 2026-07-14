import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isProtectedRoute, isPublicRoute, isStaticAsset } from '@/middleware'
import { NextRequest, NextResponse } from 'next/server'

describe('isProtectedRoute', () => {
  it('returns true for home path', () => {
    expect(isProtectedRoute('/')).toBe(true)
  })

  it('returns true for admin routes', () => {
    expect(isProtectedRoute('/admin')).toBe(true)
    expect(isProtectedRoute('/admin/')).toBe(true)
    expect(isProtectedRoute('/admin/users')).toBe(true)
    expect(isProtectedRoute('/admin/settings/general')).toBe(true)
  })

  it('returns true for plan routes', () => {
    expect(isProtectedRoute('/plan')).toBe(true)
    expect(isProtectedRoute('/plan/2024')).toBe(true)
  })

  it('returns true for equipo routes', () => {
    expect(isProtectedRoute('/equipo')).toBe(true)
    expect(isProtectedRoute('/equipo/list')).toBe(true)
  })

  it('returns true for dashboard routes', () => {
    expect(isProtectedRoute('/dashboard')).toBe(true)
    expect(isProtectedRoute('/dashboard/stats')).toBe(true)
  })

  it('returns false for login', () => {
    expect(isProtectedRoute('/login')).toBe(false)
  })

  it('returns false for register', () => {
    expect(isProtectedRoute('/register')).toBe(false)
  })

  it('returns false for unknown paths', () => {
    expect(isProtectedRoute('/about')).toBe(false)
    expect(isProtectedRoute('/contact')).toBe(false)
  })
})

describe('isPublicRoute', () => {
  it('returns true for login', () => {
    expect(isPublicRoute('/login')).toBe(true)
  })

  it('returns true for register', () => {
    expect(isPublicRoute('/register')).toBe(true)
  })

  it('returns false for protected routes', () => {
    expect(isPublicRoute('/')).toBe(false)
    expect(isPublicRoute('/admin')).toBe(false)
    expect(isPublicRoute('/dashboard')).toBe(false)
  })
})

describe('isStaticAsset', () => {
  it('returns true for _next paths', () => {
    expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true)
    expect(isStaticAsset('/_next/image')).toBe(true)
  })

  it('returns true for api paths', () => {
    expect(isStaticAsset('/api/auth/login')).toBe(true)
    expect(isStaticAsset('/api/admin/delete-user')).toBe(true)
  })

  it('returns true for favicon', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true)
  })

  it('returns true for static file extensions', () => {
    expect(isStaticAsset('/logo.png')).toBe(true)
    expect(isStaticAsset('/styles.css')).toBe(true)
    expect(isStaticAsset('/app.js')).toBe(true)
    expect(isStaticAsset('/font.woff2')).toBe(true)
  })

  it('returns false for page routes', () => {
    expect(isStaticAsset('/')).toBe(false)
    expect(isStaticAsset('/login')).toBe(false)
    expect(isStaticAsset('/admin/users')).toBe(false)
  })

  it('returns true for PWA static assets', () => {
    expect(isStaticAsset('/sw.js')).toBe(true)
    expect(isStaticAsset('/workbox-abcdef123.js')).toBe(true)
    expect(isStaticAsset('/manifest.json')).toBe(true)
  })
})

describe('middleware', () => {
  const mockUrl = 'http://localhost:3000'

  function createMockRequest(pathname: string): NextRequest {
    const url = new URL(pathname, mockUrl)
    return {
      nextUrl: url,
      url: url.toString(),
      cookies: {
        getAll: () => [],
      },
    } as unknown as NextRequest
  }

  function mockServerClient(user: unknown) {
    vi.doMock('@/lib/supabase/server', () => ({
      createClient: () => ({
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user }, error: null }),
        },
      }),
    }))
  }

  beforeEach(() => {
    vi.resetModules()
  })

  it('redirects to /login when user is null on protected route /', async () => {
    mockServerClient(null)

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    const location = response.headers.get('location')
    expect(location).toContain('/login')
    expect(location).toContain('redirect=%2F')

    vi.doUnmock('@/lib/supabase/server')
  })

  it('passes through when user is authenticated on protected route /', async () => {
    mockServerClient({ id: 'user-123' })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    // next() response has status 200, not a redirect
    expect((response as NextResponse).status).toBe(200)

    vi.doUnmock('@/lib/supabase/server')
  })

  it('passes through public routes without auth check', async () => {
    mockServerClient(null)

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/login')
    const response = await middleware(request)

    // Should NOT redirect — login is public
    expect((response as NextResponse).status).toBe(200)

    vi.doUnmock('@/lib/supabase/server')
  })

  it('redirects authenticated user away from /login to /', async () => {
    mockServerClient({ id: 'user-123' })

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/login')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    const location = response.headers.get('location')
    expect(location).toMatch(/\/$/)

    vi.doUnmock('@/lib/supabase/server')
  })

  it('redirects unauthenticated user from /admin to /login with redirect param', async () => {
    mockServerClient(null)

    const { middleware } = await import('@/middleware')
    const request = createMockRequest('/admin/users')
    const response = await middleware(request)

    expect(response).toBeInstanceOf(NextResponse)
    const location = response.headers.get('location')
    expect(location).toContain('/login')
    expect(location).toContain('redirect=%2Fadmin%2Fusers')

    vi.doUnmock('@/lib/supabase/server')
  })
})
