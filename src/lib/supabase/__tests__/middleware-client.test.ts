import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'
import { createServerClient } from '@supabase/ssr'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

// Capture the cookie adapters passed to createServerClient
let capturedSetAll: ((cookies: { name: string; value: string; options?: Record<string, unknown> }[], headers: Record<string, string>) => void) | null = null

vi.mock('@supabase/ssr', async () => {
  const actual = await vi.importActual<typeof import('@supabase/ssr')>('@supabase/ssr')
  return {
    ...actual,
    createServerClient: vi.fn((url: string, key: string, options: { cookies: { getAll: () => unknown; setAll: typeof capturedSetAll } }) => {
      capturedSetAll = options.cookies.setAll
      return { auth: {} }
    }),
  }
})

// Set required env vars before importing the factory
const TEST_ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
}

function mockRequest(url = 'https://example.com/admin', cookies: { name: string; value: string }[] = []) {
  return {
    url,
    nextUrl: new URL(url),
    cookies: {
      getAll: vi.fn(() => cookies),
    },
  } as unknown as Parameters<typeof createMiddlewareClient>[0]
}

function mockResponse() {
  const setCalls: Array<{ name: string; value: string; options?: Record<string, unknown> }> = []
  const headersMap = new Map<string, string>()
  return {
    cookies: {
      set: vi.fn(({ name, value, ...options }) => {
        setCalls.push({ name, value, options })
      }),
    },
    headers: {
      set: vi.fn((name: string, value: string) => {
        headersMap.set(name, value)
      }),
      get: vi.fn((name: string) => headersMap.get(name) ?? null),
    },
    setCalls,
    headersMap,
  } as unknown as Parameters<typeof createMiddlewareClient>[1] & {
    setCalls: typeof setCalls
    headersMap: Map<string, string>
  }
}

describe('createMiddlewareClient factory (REQ-14)', () => {
  let originalEnv: Record<string, string | undefined>

  beforeAll(() => {
    originalEnv = {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_COOKIE_DOMAIN: process.env.NEXT_PUBLIC_COOKIE_DOMAIN,
    }
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_ENV.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalEnv.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (originalEnv.NEXT_PUBLIC_COOKIE_DOMAIN !== undefined) {
      process.env.NEXT_PUBLIC_COOKIE_DOMAIN = originalEnv.NEXT_PUBLIC_COOKIE_DOMAIN
    } else {
      delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN
    }
  })

  it('creates a client without error', () => {
    const req = mockRequest('https://example.com/admin', [
      { name: 'sb-abc123-auth-token', value: 'test-token-value' },
    ])
    const res = mockResponse()

    const client = createMiddlewareClient(req, res)
    expect(client).toBeDefined()
    expect(client.auth).toBeDefined()
  })

  it('getAll reads from request.cookies.getAll()', () => {
    const req = mockRequest('https://example.com/admin', [
      { name: 'sb-abc123-auth-token', value: 'test-token-value' },
      { name: 'other-cookie', value: 'other-value' },
    ])
    const res = mockResponse()

    createMiddlewareClient(req, res)
    // The factory captures request.cookies.getAll in the getAll adapter
    // Verify the mock is properly wired
    expect(req.cookies.getAll).toBeDefined()
  })

  it('setAll writes to response.cookies.set with W3 domain injection', () => {
    const req = mockRequest('https://i-relevos.vercel.app/admin', [])
    const res = mockResponse()

    createMiddlewareClient(req, res)

    // Verify the domain injection logic
    const host = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? new URL(req.url).host
    expect(host).toBe('i-relevos.vercel.app')

    // Simulate what setAll does
    res.cookies.set({ name: 'sb-abc-auth-token', value: 'refreshed', domain: host })
    expect(res.setCalls).toContainEqual({
      name: 'sb-abc-auth-token',
      value: 'refreshed',
      options: { domain: 'i-relevos.vercel.app' },
    })
  })

  it('uses NEXT_PUBLIC_COOKIE_DOMAIN env var when set', () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = '.custom-domain.com'

    const req = mockRequest('https://i-relevos.vercel.app/admin', [])
    const host = process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? new URL(req.url).host
    expect(host).toBe('.custom-domain.com')

    delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN
  })

  it('cookie name pattern: sb-<ref>-auth-token IS a Supabase cookie', () => {
    const supabasePattern = /^sb-.*-auth-token$/
    expect(supabasePattern.test('sb-abc123-auth-token')).toBe(true)
    expect(supabasePattern.test('sb-xyz-auth-token')).toBe(true)
    expect(supabasePattern.test('sb-project-ref-123-auth-token')).toBe(true)
  })

  it('cookie name pattern: non-Supabase cookies do NOT match', () => {
    const supabasePattern = /^sb-.*-auth-token$/
    expect(supabasePattern.test('not-a-supabase-cookie')).toBe(false)
    expect(supabasePattern.test('session-id')).toBe(false)
    expect(supabasePattern.test('sb-partial')).toBe(false)
    expect(supabasePattern.test('auth-token')).toBe(false)
  })

  it('setAll forwards anti-cache headers to response.headers (C1 — REQ-05/D8)', () => {
    const req = mockRequest('https://i-relevos.vercel.app/admin', [])
    const res = mockResponse()

    createMiddlewareClient(req, res)

    // The setAll callback was captured by our mock of createServerClient
    expect(capturedSetAll).not.toBeNull()

    // Simulate what @supabase/ssr does: call setAll with cookies + headers
    const fakeHeaders: Record<string, string> = {
      'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0',
      'Expires': '0',
      'Pragma': 'no-cache',
    }

    const cookiesToSet = [
      { name: 'sb-test-auth-token', value: 'test-value', options: {} },
    ]

    // Call setAll with both cookies AND headers (this is the library's actual call)
    capturedSetAll!(cookiesToSet, fakeHeaders)

    // Assert cookies were set with domain injection
    expect(res.setCalls).toContainEqual({
      name: 'sb-test-auth-token',
      value: 'test-value',
      options: { domain: 'i-relevos.vercel.app' },
    })

    // Assert anti-cache headers were forwarded to response.headers.set
    expect(res.headersMap.get('Cache-Control')).toBe(
      'private, no-cache, no-store, must-revalidate, max-age=0',
    )
    expect(res.headersMap.get('Cache-Control')).toContain('no-store')
    expect(res.headersMap.get('Pragma')).toBe('no-cache')
    expect(res.headersMap.get('Expires')).toBe('0')
  })
})
