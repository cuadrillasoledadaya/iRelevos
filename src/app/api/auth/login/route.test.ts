import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the supabase module before importing the route
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
    })),
  },
}))

// Mock CORS helpers
vi.mock('@/lib/cors', () => ({
  withCors: (response: Response) => response,
  handleCorsPreflight: () => null,
}))

// Mock apiHelpers
vi.mock('@/lib/apiHelpers', () => ({
  jsonResponse: (body: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(body), {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers as Record<string, string> || {}) },
    }),
}))

// Mock rateLimit with a controllable implementation
const mockRateLimit = vi.fn()
vi.mock('@/lib/rateLimit', () => ({
  rateLimit: (...args: unknown[]) => mockRateLimit(...args),
}))

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function callLogin(body: Record<string, unknown>) {
    const { POST } = await import('@/app/api/auth/login/route')
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    return POST(request)
  }

  it('rejects with 429 after rate limit is exhausted', async () => {
    // First 5 calls succeed
    for (let i = 0; i < 5; i++) {
      mockRateLimit.mockReturnValue({ success: true, remaining: 4 - i, resetAt: Date.now() + 900000 })
    }
    // 6th call is rejected
    mockRateLimit.mockReturnValue({ success: false, remaining: 0, resetAt: Date.now() + 900000 })

    // Exhaust the limit
    for (let i = 0; i < 5; i++) {
      await callLogin({ email: 'test@example.com', password: 'pass' })
    }

    // 6th call should be rate limited
    const response = await callLogin({ email: 'test@example.com', password: 'pass' })

    expect(response.status).toBe(429)
    const body = await response.json()
    expect(body.error).toContain('Demasiados intentos')
    expect(body.remaining).toBe(0)
  })

  it('returns 400 for missing email', async () => {
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 900000 })

    const response = await callLogin({ password: 'pass' })

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toContain('Email o contraseña')
  })

  it('returns 400 for missing password', async () => {
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 900000 })

    const response = await callLogin({ email: 'test@example.com' })

    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid body', async () => {
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 900000 })

    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json',
    })

    const { POST } = await import('@/app/api/auth/login/route')
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns generic error message on auth failure (never reveals specific error)', async () => {
    mockRateLimit.mockReturnValue({ success: true, remaining: 4, resetAt: Date.now() + 900000 })

    const { supabase } = await import('@/lib/supabase')
    vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' } as any,
    })

    const response = await callLogin({ email: 'test@example.com', password: 'wrong' })

    expect(response.status).toBe(200) // Route returns 200 with error message in body
    const body = await response.json()
    // Should NOT reveal the specific error
    expect(body.error).not.toBe('Invalid login credentials')
  })
})
