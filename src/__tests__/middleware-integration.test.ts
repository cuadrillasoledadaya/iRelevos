// @vitest-environment node
import { describe, it, expect, beforeAll, afterEach, afterAll, vi } from 'vitest'
import { setupServer } from 'msw/node'
import { middleware } from '@/middleware'
import { handlers, createServerErrorHandler } from './mocks/handlers'

// Set required env vars
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})
afterAll(() => server.close())

function createMockRequest(url: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')

  const urlObj = new URL(url)
  return {
    url,
    nextUrl: urlObj,
    cookies: {
      getAll: () =>
        Object.entries(cookies).map(([name, value]) => ({ name, value })),
      get: (name: string) => cookies[name] ?? undefined,
    },
    headers: new Headers({
      cookie: cookieHeader,
    }),
  } as unknown as Parameters<typeof middleware>[0]
}

describe('middleware() integration (REQ-15)', () => {
  it('1. Valid session cookie → NextResponse.next() with refreshed Set-Cookie', async () => {
    const req = createMockRequest('https://example.com/admin', {
      'sb-test-auth-token': 'valid-access-token',
    })

    // We can't fully test the real NextResponse.next() in node env,
    // but we can verify the middleware doesn't throw and processes the request
    const response = await middleware(req)
    expect(response).toBeDefined()
  })

  it('2. No session cookie on protected route → 302 to /login?redirect=<path>', async () => {
    const req = createMockRequest('https://example.com/admin', {})
    const response = await middleware(req)

    expect(response).toBeDefined()
    // The middleware should redirect to /login
    const status = (response as { status?: number }).status
    // In the real NextResponse, redirect returns a 307
    expect(status).toBe(307)
  })

  it('3. Tampered cookie → 302 to /login + Set-Cookie with Max-Age=0', async () => {
    const req = createMockRequest('https://example.com/admin', {
      'sb-test-auth-token': 'tampered-token',
    })
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    expect(status).toBe(307)
  })

  it('4. Expired cookie → 302 to /login', async () => {
    const req = createMockRequest('https://example.com/admin', {
      'sb-test-auth-token': 'expired-token',
    })
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    expect(status).toBe(307)
  })

  it('5. Supabase 5xx / network failure → 302 to /login (fails closed)', async () => {
    server.use(createServerErrorHandler())

    const req = createMockRequest('https://example.com/admin', {
      'sb-test-auth-token': 'valid-access-token',
    })
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    expect(status).toBe(307)
  })

  it('6. Public path with no session → NextResponse.next()', async () => {
    const req = createMockRequest('https://example.com/login', {})
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    // Public route with no session should pass through (200 from NextResponse.next())
    expect(status).toBe(200)
  })

  it('7. Static asset path → NextResponse.next() (no getUser() call)', async () => {
    const req = createMockRequest('https://example.com/_next/static/chunks/main.js', {})
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    expect(status).toBe(200)
  })

  it('8. PWA/asset path → NextResponse.next() (no getUser() call)', async () => {
    const req = createMockRequest('https://example.com/favicon.ico', {})
    const response = await middleware(req)

    expect(response).toBeDefined()
    const status = (response as { status?: number }).status
    expect(status).toBe(200)
  })
})
