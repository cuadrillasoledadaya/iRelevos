import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

vi.mock('@/lib/supabaseAdmin')

describe('GET /api/import-costaleros', () => {
  const mockAdmin = {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getSupabaseAdmin).mockReturnValue(mockAdmin as unknown as ReturnType<typeof getSupabaseAdmin>)
  })

  it('should return 401 when no Authorization header', async () => {
    const req = new Request('http://localhost/api/import-costaleros')
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('No autenticado')
  })

  it('should return 401 when token is invalid', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') })

    const req = new Request('http://localhost/api/import-costaleros', {
      headers: { Authorization: 'Bearer bad-token' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(401)
    expect(json.error).toBe('Token inválido')
  })

  it('should return 403 when user is not admin', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })

    mockAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'costalero' }, error: null }),
    })

    const req = new Request('http://localhost/api/import-costaleros', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(403)
    expect(json.error).toBe('Solo admins pueden importar costaleros')
  })

  it('should return 500 when env vars are missing', async () => {
    mockAdmin.auth.getUser.mockResolvedValue({
      data: { user: { id: 'admin-1' } },
      error: null,
    })

    mockAdmin.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { role: 'superadmin' }, error: null }),
    })

    const originalUrl = process.env.ICUADRILLA_API_URL
    const originalToken = process.env.ICUADRILLA_API_TOKEN
    delete process.env.ICUADRILLA_API_URL
    delete process.env.ICUADRILLA_API_TOKEN

    const req = new Request('http://localhost/api/import-costaleros', {
      headers: { Authorization: 'Bearer valid-token' },
    })
    const res = await GET(req)
    const json = await res.json()

    expect(res.status).toBe(500)
    expect(json.error).toContain('Faltan variables de entorno')

    process.env.ICUADRILLA_API_URL = originalUrl
    process.env.ICUADRILLA_API_TOKEN = originalToken
  })
})
